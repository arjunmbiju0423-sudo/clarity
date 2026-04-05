"""
lecture_analysis.py

FastAPI router for the Catapult lecture analysis pipeline.

Endpoints:
  POST /api/analyze-segment      — analyze a single segment
  POST /api/analyze-lecture      — analyze multiple segments in sequence

Pipeline per segment:
  1. lecture_analysis_service  — content difficulty / novelty / pacing / segment_type / content_features
  2. tribe_service             — raw cognitive intensity (TRIBE v2)
  3. tribe_summary_service     — structured cognitive-pressure summary
  4. mirofish_service          — 3-persona simulation (TRIBE + content-feature informed)
  5. fusion_service            — final unified output JSON with evidence traces
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from ..services import (
    lecture_analysis_service,
    tribe_service,
    tribe_summary_service,
    mirofish_service,
    fusion_service,
)

router = APIRouter(prefix="/api", tags=["lecture-analysis"])


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class SegmentRequest(BaseModel):
    segment_id: str
    time_range: dict                   # {"start": float, "end": float}
    transcript_segment: str
    slide_text: Optional[str] = ""
    visual_context: Optional[str] = ""
    video_path: Optional[str] = None   # passed to tribe_service if USE_REAL_TRIBE=true
    previous_mean_intensity: Optional[float] = None


class LectureRequest(BaseModel):
    segments: List[SegmentRequest]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/analyze-segment")
def analyze_segment(req: SegmentRequest):
    """Analyze a single lecture segment through the full pipeline."""
    return _run_pipeline(req, previous_mean_intensity=req.previous_mean_intensity)


@router.post("/analyze-lecture")
def analyze_lecture(req: LectureRequest):
    """
    Analyze a full lecture (list of segments) sequentially.
    Passes previous segment's mean intensity to each subsequent segment
    so TRIBE delta is correctly computed.
    """
    results = []
    prev_mean = None

    for segment in req.segments:
        result = _run_pipeline(segment, previous_mean_intensity=prev_mean)
        results.append(result)
        prev_mean = _extract_mean_intensity(result)

    fusion_service.assign_lecture_relative_flags(results)

    summary = _build_lecture_summary(results)
    return {
        "segments": results,
        "lecture_summary": summary,
        "tribe_source": results[0].get("tribe_source", "mock") if results else "mock",
    }


# ---------------------------------------------------------------------------
# Pipeline runner
# ---------------------------------------------------------------------------

def _run_pipeline(req: SegmentRequest, previous_mean_intensity: Optional[float] = None) -> dict:
    # Step 1: Lecture content analysis (now includes segment_type + content_features)
    la = lecture_analysis_service.analyze_segment(
        transcript_segment=req.transcript_segment,
        slide_text=req.slide_text or "",
        visual_context=req.visual_context or "",
        segment_id=req.segment_id,
    )

    # Pass content hints to TRIBE for better mock fidelity
    content_hints = {
        "difficulty_level": la.get("difficulty_level", "medium"),
        "conceptual_density": la.get("conceptual_density", "medium"),
        "segment_type": la.get("segment_type", "definition"),
    }

    # Step 2 + 3: TRIBE intensity → summary
    tribe_output = tribe_service.get_tribe_intensity(
        video_path=req.video_path,
        transcript_text=req.transcript_segment,
        segment_id=req.segment_id,
        content_hints=content_hints,
    )
    tribe_summary = tribe_summary_service.summarize_tribe_output(
        tribe_output=tribe_output,
        previous_mean_intensity=previous_mean_intensity,
    )

    # Step 4: MiroFish persona simulation (TRIBE + content-feature informed)
    personas = mirofish_service.simulate_personas(
        lecture_analysis=la,
        tribe_summary=tribe_summary,
        segment_id=req.segment_id,
    )

    # Step 5: Fusion (now includes evidence traces + segment_type + confidence float)
    result = fusion_service.fuse(
        segment_id=req.segment_id,
        time_range=req.time_range,
        lecture_analysis=la,
        tribe_summary=tribe_summary,
        mirofish_personas=personas,
    )

    return result


# ---------------------------------------------------------------------------
# Lecture-level summary
# ---------------------------------------------------------------------------

def _build_lecture_summary(results: list) -> dict:
    if not results:
        return {}

    most_confusing = max(results, key=lambda r: r.get("friction_score", 0))
    most_engaging = max(results, key=lambda r: r.get("engagement_score", 0))
    least_engaging = min(results, key=lambda r: r.get("engagement_score", 1))
    most_review = max(results, key=lambda r: r.get("friction_score", 0))

    # Collect segment types distribution
    type_counts = {}
    for r in results:
        st = r.get("segment_type", "unknown")
        type_counts[st] = type_counts.get(st, 0) + 1

    return {
        "total_segments": len(results),
        "most_confusing_segment": most_confusing.get("segment_id"),
        "most_confusing_time": most_confusing.get("time_range"),
        "most_engaging_segment": most_engaging.get("segment_id"),
        "most_engaging_time": most_engaging.get("time_range"),
        "least_engaging_segment": least_engaging.get("segment_id"),
        "least_engaging_time": least_engaging.get("time_range"),
        "most_review_needed_segment": most_review.get("segment_id"),
        "most_review_needed_time": most_review.get("time_range"),
        "average_friction": round(
            sum(r.get("friction_score", 0) for r in results) / len(results), 3
        ),
        "average_engagement": round(
            sum(r.get("engagement_score", 0) for r in results) / len(results), 3
        ),
        "segment_type_distribution": type_counts,
    }


def _extract_mean_intensity(result: dict) -> Optional[float]:
    return result.get("friction_score")
