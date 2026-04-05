"""
tribe_service.py

Wrapper around TRIBE v2 (facebook/tribev2).

TRIBE v2 paper corrections applied here:
  - Output is (n_timesteps @ 1Hz) × (20,484 cortical vertices on fsaverage5 surface)
  - Vertices are NOT named brain regions — they are surface mesh points
  - Valid: mean across vertices (global intensity), temporal slope, approx region groupings
  - TR = 1.0s (paper §5.3: output resampled to ffMRI = 1Hz)
  - Subcortical: 8 regions from Harvard-Oxford atlas (8,802 voxels)
  - Region groupings below are approximate HCP parcellation priors —
    NOT exact atlas lookups. Labeled clearly as approximate.

Toggle:
    USE_REAL_TRIBE=true   → uses TribeModel from tribev2 repo
    USE_REAL_TRIBE=false  → returns content-driven mock output (default)

Output schema (identical regardless of path):
{
    "timeline":           list[float],   # per-TR global intensity (1Hz, normalised [0,1])
    "timestamps":         list[float],   # seconds since segment start (0, 1, 2, ...)
    "mean_intensity":     float,         # global mean [0,1]
    "peak_intensity":     float,         # global peak [0,1]
    "relative_change":    float,         # signed Δ vs previous segment mean
    "temporal_pattern":   str,           # "rising" | "falling" | "stable" | "spike"
    "region_activations": dict,          # approximate functional region values (see below)
    "source":             str,           # "tribe_v2" | "mock"
}

region_activations keys (approximate, lecture-relevant, per TRIBE paper Fig 7B):
    language_network   — auditory cortex + inferior frontal (Broca/Wernicke area)
    prefrontal         — dorsolateral PFC, working memory / executive function proxy
    visual_cortex      — early + ventral visual stream (V1–V4, occipital)
    temporal_parietal  — TPJ, multisensory comprehension hub
    default_mode       — DMN proxy (elevated = mind-wandering, inverse of engagement)
    subcortical        — amygdala + hippocampus proxy (stress + memory encoding)
"""

import os
import sys
import logging
import math
from typing import Optional

logger = logging.getLogger(__name__)

USE_REAL_TRIBE: bool = os.environ.get("USE_REAL_TRIBE", "false").lower() == "true"

_TRIBE_REPO_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../../../tribev2")
)

_model = None  # None | <model> | "FAILED"

# ---------------------------------------------------------------------------
# Approximate HCP-atlas vertex index ranges for fsaverage5 (20,484 vertices)
# LH: 0–10241  RH: 10242–20483
# These are rough anatomical priors from HCP parcellation literature.
# NOT exact atlas lookups — only for visualization.
# ---------------------------------------------------------------------------

_APPROX_REGIONS = {
    "language_network":  (slice(7500, 9500),  slice(17742, 19742)),
    "prefrontal":        (slice(0, 2000),      slice(10242, 12242)),
    "visual_cortex":     (slice(9500, 10242),  slice(19742, 20483)),
    "temporal_parietal": (slice(6000, 7500),   slice(16242, 17742)),
    "default_mode":      (slice(2000, 3500),   slice(12242, 13742)),
    "subcortical":       None,  # derived from subcortical output if available
}


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def get_tribe_intensity(
    video_path: Optional[str] = None,
    transcript_text: Optional[str] = "",
    segment_id: str = "",
    previous_mean_intensity: Optional[float] = None,
    content_hints: Optional[dict] = None,
) -> dict:
    """
    Get cognitive intensity signals for a lecture segment.

    Args:
        video_path:              path to video file
        transcript_text:         transcript text
        segment_id:              identifier for logging
        previous_mean_intensity: mean intensity of previous segment (for Δ)
        content_hints:           dict from lecture_analysis_service

    Returns:
        dict — see module docstring for full schema
    """
    if USE_REAL_TRIBE:
        result = _try_real_tribe(video_path, transcript_text, segment_id, previous_mean_intensity)
        if result is not None:
            return result
        logger.warning("tribe_service [%s]: real TRIBE failed, falling back to mock", segment_id)

    return _mock_intensity(
        transcript_text or "", segment_id, previous_mean_intensity, content_hints or {}
    )


# ---------------------------------------------------------------------------
# Real TRIBE v2 path
# ---------------------------------------------------------------------------

def _try_real_tribe(video_path, transcript_text, segment_id, previous_mean):
    model = _load_model()
    if model is None:
        return None

    try:
        if video_path and os.path.isfile(video_path):
            events_df = model.get_events_dataframe(video_path=video_path)
        elif transcript_text:
            import pandas as pd
            events_df = pd.DataFrame([{
                "type": "Text",
                "timeline": "lecture",
                "start": 0.0,
                "duration": max(10.0, len(transcript_text.split()) / 2.5),
                "text": transcript_text,
            }])
        else:
            return None

        result = model.predict(events=events_df)
        preds = result[0] if isinstance(result, tuple) else result

        return _extract_features(preds, source="tribe_v2", previous_mean=previous_mean)

    except Exception as exc:
        logger.warning("tribe_service [%s]: inference error — %s", segment_id, exc)
        return None


def _load_model():
    global _model
    if _model == "FAILED":
        return None
    if _model is not None:
        return _model

    if _TRIBE_REPO_PATH not in sys.path:
        sys.path.insert(0, _TRIBE_REPO_PATH)

    try:
        from tribev2 import TribeModel
        logger.info("tribe_service: loading TribeModel...")
        _model = TribeModel.from_pretrained(
            "facebook/tribev2",
            cache_folder=os.path.join(_TRIBE_REPO_PATH, ".tribe_cache"),
        )
        logger.info("tribe_service: TribeModel loaded")
        return _model
    except ImportError as exc:
        logger.warning("tribe_service: tribev2 not importable (%s)", exc)
    except Exception as exc:
        logger.warning("tribe_service: model load failed — %s", exc)

    _model = "FAILED"
    return None


def _extract_features(preds, source: str, previous_mean: Optional[float]) -> dict:
    """
    Extract features from real TRIBE prediction tensor.

    preds shape: (n_timesteps, 20484 vertices)
    Output is at 1Hz (TR = 1s) per paper §5.3.
    """
    try:
        if hasattr(preds, "detach"):
            preds = preds.detach().cpu().numpy()

        import numpy as np
        arr = np.abs(np.array(preds))  # (T, V)

        if arr.ndim != 2 or arr.shape[0] == 0:
            return _empty_features(source)

        n_timesteps, n_vertices = arr.shape

        # Global timeline
        global_per_ts = arr.mean(axis=1)
        max_val = global_per_ts.max() or 1.0
        timeline = (global_per_ts / max_val).tolist()

        mean_val = float(global_per_ts.mean() / max_val)
        peak_val = float(global_per_ts.max() / max_val)
        relative_change = (mean_val - previous_mean) if previous_mean is not None else 0.0
        temporal_pattern = _classify_temporal_pattern(timeline)

        # Region activations
        if n_vertices == 20484:
            region_activations = {}
            for name, slices in _APPROX_REGIONS.items():
                if slices is None:
                    region_activations[name] = round(mean_val * 0.6, 4)  # subcortical proxy
                    continue
                lh_slice, rh_slice = slices
                val = float((arr[:, lh_slice].mean() + arr[:, rh_slice].mean()) / 2.0 / max_val)
                region_activations[name] = round(val, 4)
        else:
            logger.warning("tribe_service: unexpected vertex count %d", n_vertices)
            region_activations = {k: round(mean_val, 4) for k in _APPROX_REGIONS}

        return {
            "timeline":           [round(v, 4) for v in timeline],
            "timestamps":         [float(i) for i in range(n_timesteps)],
            "mean_intensity":     round(mean_val, 4),
            "peak_intensity":     round(peak_val, 4),
            "relative_change":    round(relative_change, 4),
            "temporal_pattern":   temporal_pattern,
            "region_activations": region_activations,
            "source":             source,
        }

    except Exception as exc:
        logger.warning("tribe_service: feature extraction error — %s", exc)
        return _empty_features(source)


def _classify_temporal_pattern(timeline: list) -> str:
    if len(timeline) < 3:
        return "stable"
    n = len(timeline)
    mid = n // 2
    first_mean = sum(timeline[:mid]) / mid
    second_mean = sum(timeline[mid:]) / (n - mid)
    peak = max(timeline)
    mean_val = sum(timeline) / n

    if peak > mean_val + 0.30:
        return "spike"
    delta = second_mean - first_mean
    if delta > 0.12:
        return "rising"
    if delta < -0.12:
        return "falling"
    return "stable"


def _empty_features(source: str) -> dict:
    return {
        "timeline":           [],
        "timestamps":         [],
        "mean_intensity":     0.0,
        "peak_intensity":     0.0,
        "relative_change":    0.0,
        "temporal_pattern":   "stable",
        "region_activations": {k: 0.0 for k in _APPROX_REGIONS},
        "source":             source,
    }


# ---------------------------------------------------------------------------
# Mock / content-driven path
# ---------------------------------------------------------------------------

def _mock_intensity(text, segment_id, previous_mean, content_hints):
    """
    Content-driven mock grounded in TRIBE paper findings (Fig 7B):
    - Speech/text → language_network + prefrontal dominant
    - Technical/dense → prefrontal (working memory) elevated
    - Low novelty → default_mode elevated (mind-wandering)
    - High difficulty → subcortical elevated (stress response)
    """
    base = _heuristic_base(text, content_hints)

    n = 12  # ~12s segment at 1Hz
    timeline = [_clamp(base + 0.07 * math.sin(i * math.pi * 1.5 / (n - 1))) for i in range(n)]

    mean_val = sum(timeline) / n
    peak_val = max(timeline)
    relative_change = (mean_val - previous_mean) if previous_mean is not None else 0.0

    return {
        "timeline":           [round(v, 4) for v in timeline],
        "timestamps":         [float(i) for i in range(n)],
        "mean_intensity":     round(mean_val, 4),
        "peak_intensity":     round(peak_val, 4),
        "relative_change":    round(relative_change, 4),
        "temporal_pattern":   _classify_temporal_pattern(timeline),
        "region_activations": _mock_region_activations(text, content_hints, mean_val),
        "source":             "mock",
    }


def _mock_region_activations(text, hints, global_mean):
    words = text.lower().split() if text else []
    wc = len(words)

    tech = {
        "algorithm", "theorem", "derivative", "integral", "matrix", "recursion",
        "complexity", "gradient", "convolution", "eigenvalue", "polynomial",
        "stochastic", "backpropagation", "transformer", "embedding", "topology",
        "variance", "covariance", "regression", "neural", "hypothesis",
    }
    eq_markers = {"=", "≈", "∇", "∑", "∫", "θ", "α", "β", "∂", "λ"}

    jargon = sum(1 for w in words if w in tech)
    eqs    = sum(1 for w in words if any(m in w for m in eq_markers))
    jd = min(jargon / max(wc / 20, 1), 1.0)
    ed = min(eqs    / max(wc / 30, 1), 1.0)

    diff_map = {"low": 0.2, "medium": 0.5, "high": 0.85}
    nov_map  = {"low": 0.2, "medium": 0.55, "high": 0.85}
    den_map  = {"low": 0.30, "medium": 0.48, "high": 0.68}

    dv  = diff_map.get(hints.get("difficulty_level", "medium"), 0.5)
    nv  = nov_map.get(hints.get("novelty_level", "medium"), 0.55)
    den = den_map.get(hints.get("conceptual_density", "medium"), 0.48)

    return {
        "language_network":  round(_clamp(0.35 + 0.25 * min(wc / 100, 1.0) + 0.15 * dv), 4),
        "prefrontal":        round(_clamp(0.25 + 0.35 * jd + 0.20 * ed + 0.15 * dv), 4),
        "visual_cortex":     round(_clamp(0.18 + 0.15 * ed), 4),
        "temporal_parietal": round(_clamp(den), 4),
        "default_mode":      round(_clamp(0.25 + 0.35 * (1.0 - nv) + 0.15 * (1.0 - dv)), 4),
        "subcortical":       round(_clamp(0.18 + 0.25 * dv + 0.15 * nv), 4),
    }


def _heuristic_base(text, hints):
    if not text:
        return 0.35
    words = text.lower().split()
    wc = len(words)
    tech = {
        "algorithm", "theorem", "derivative", "integral", "matrix", "recursion",
        "complexity", "entropy", "gradient", "convolution", "eigenvalue", "polynomial",
        "probabilistic", "stochastic", "neural", "backpropagation", "transformer",
    }
    jd = min(sum(1 for w in words if w in tech) / max(wc / 20, 1), 1.0)
    ls = min(wc / 150, 1.0)
    db = {"low": 0.0, "medium": 0.05, "high": 0.15}.get(hints.get("difficulty_level", "medium"), 0.05)
    return _clamp(0.20 + 0.35 * jd + 0.15 * ls + db, lo=0.15, hi=0.85)


def _clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))
