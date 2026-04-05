"""
lecture_analysis.py

FastAPI router for the Catapult lecture analysis pipeline.

Endpoints:
  POST /api/analyze-segment      — analyze a single segment
  POST /api/analyze-lecture      — analyze multiple segments in sequence

Pipeline per segment:
  1. lecture_analysis_service  — content analysis (LLM or heuristic)
  2. tribe_service             — cognitive intensity (real TRIBE, text-only, or mock)
  3. tribe_summary_service     — structured summary of TRIBE output
  4. mirofish_service          — persona simulation (content-feature informed)
  5. fusion_service            — final output with analysis_meta

Every response now includes analysis_meta at both segment and lecture level,
making it explicit whether real video analysis was performed.
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
    video_path: Optional[str] = None
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
    """
    results = []
    prev_tribe_mean = None

    for segment in req.segments:
        result = _run_pipeline(segment, previous_mean_intensity=prev_tribe_mean)
        results.append(result)
        # Feed TRIBE mean intensity (not friction_score) forward for delta computation
        prev_tribe_mean = result.get("_tribe_mean_intensity")

    # Remove internal field before returning
    for r in results:
        r.pop("_tribe_mean_intensity", None)

    fusion_service.assign_lecture_relative_flags(results)

    summary = _build_lecture_summary(results)

    # Collect all warnings from segments
    all_warnings = []
    sources = set()
    any_video_used = False
    for r in results:
        meta = r.get("analysis_meta", {})
        sources.add(meta.get("tribe_source", "unknown"))
        if meta.get("video_used"):
            any_video_used = True
        for w in meta.get("warnings", []):
            if w not in all_warnings:
                all_warnings.append(w)

    return {
        "segments": results,
        "lecture_summary": summary,
        "analysis_meta": {
            "tribe_sources": sorted(sources),
            "video_used": any_video_used,
            "warnings": all_warnings,
            "segment_count": len(results),
        },
    }


# ---------------------------------------------------------------------------
# Pipeline runner
# ---------------------------------------------------------------------------

def _run_pipeline(req: SegmentRequest, previous_mean_intensity: Optional[float] = None) -> dict:
    # Step 1: Content analysis
    la = lecture_analysis_service.analyze_segment(
        transcript_segment=req.transcript_segment,
        slide_text=req.slide_text or "",
        visual_context=req.visual_context or "",
        segment_id=req.segment_id,
    )

    content_hints = {
        "difficulty_level": la.get("difficulty_level", "medium"),
        "conceptual_density": la.get("conceptual_density", "medium"),
        "novelty_level": la.get("novelty_level", "medium"),
        "segment_type": la.get("segment_type", "definition"),
    }

    # Step 2: TRIBE intensity (returns explicit metadata about what ran)
    tribe_output = tribe_service.get_tribe_intensity(
        video_path=req.video_path,
        transcript_text=req.transcript_segment,
        segment_id=req.segment_id,
        previous_mean_intensity=previous_mean_intensity,
        content_hints=content_hints,
    )

    # Extract TRIBE metadata before summarization strips it
    tribe_metadata = {
        "source": tribe_output.get("source", "unknown"),
        "video_used": tribe_output.get("video_used", False),
        "fallback_reason": tribe_output.get("fallback_reason"),
        "warnings": tribe_output.get("warnings", []),
    }

    # Step 3: TRIBE summary
    tribe_summary = tribe_summary_service.summarize_tribe_output(
        tribe_output=tribe_output,
        previous_mean_intensity=previous_mean_intensity,
    )

    # Step 4: Persona simulation
    personas = mirofish_service.simulate_personas(
        lecture_analysis=la,
        tribe_summary=tribe_summary,
        segment_id=req.segment_id,
    )

    # Step 5: Fusion (now receives tribe_metadata for analysis_meta)
    result = fusion_service.fuse(
        segment_id=req.segment_id,
        time_range=req.time_range,
        lecture_analysis=la,
        tribe_summary=tribe_summary,
        mirofish_personas=personas,
        tribe_metadata=tribe_metadata,
    )

    # Carry TRIBE mean intensity forward for next segment's delta
    # (NOT friction_score — that's a fused output, wrong signal for TRIBE delta)
    result["_tribe_mean_intensity"] = tribe_output.get("mean_intensity")

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
