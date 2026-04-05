"""
tribe_service.py

Wrapper around TRIBE v2 (facebook/tribev2).

Analysis modes (explicit, never silent):
  "tribe_v2"    — USE_REAL_TRIBE=true AND model loaded AND video provided
  "tribe_text"  — USE_REAL_TRIBE=true AND model loaded but NO video (text-only prediction)
  "mock"        — USE_REAL_TRIBE=false (default). Content-driven heuristic. No video analyzed.
  "fallback"    — USE_REAL_TRIBE=true but model failed to load or inference errored.

Every response includes:
  source:           which mode actually ran
  video_used:       whether a real video file was read
  fallback_reason:  why we're not in the requested mode (null if no fallback)
  warnings:         list of human-readable caveats
"""

import os
import sys
import logging
import math
import hashlib
from typing import Optional

logger = logging.getLogger(__name__)

USE_REAL_TRIBE: bool = os.environ.get("USE_REAL_TRIBE", "false").lower() == "true"

_TRIBE_REPO_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../../../tribev2")
)

_model = None  # None | <model> | "FAILED"

_APPROX_REGIONS = {
    "language_network":  (slice(7500, 9500),  slice(17742, 19742)),
    "prefrontal":        (slice(0, 2000),      slice(10242, 12242)),
    "visual_cortex":     (slice(9500, 10242),  slice(19742, 20483)),
    "temporal_parietal": (slice(6000, 7500),   slice(16242, 17742)),
    "default_mode":      (slice(2000, 3500),   slice(12242, 13742)),
    "subcortical":       None,
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

    Returns dict with explicit metadata about what mode actually ran.
    """
    warnings = []
    fallback_reason = None
    video_used = False
    video_exists = video_path and os.path.isfile(video_path)

    # ── Real TRIBE path ───────────────────────────────────────────────────
    if USE_REAL_TRIBE:
        model = _load_model()
        if model is None:
            fallback_reason = "TRIBE model failed to load (import error or missing weights)"
            warnings.append("Requested real TRIBE but model is unavailable. Using fallback heuristic.")
            logger.warning("tribe_service [%s]: %s", segment_id, fallback_reason)
        else:
            # Try video-based prediction first
            if video_exists:
                result = _try_real_tribe_video(model, video_path, segment_id, previous_mean_intensity)
                if result is not None:
                    result["video_used"] = True
                    result["fallback_reason"] = None
                    result["warnings"] = []
                    return result
                fallback_reason = "TRIBE inference failed on video file"
                warnings.append(f"Video was provided but TRIBE inference failed. Using text-only prediction.")
                logger.warning("tribe_service [%s]: video inference failed, trying text", segment_id)

            # Try text-only prediction
            if transcript_text:
                result = _try_real_tribe_text(model, transcript_text, segment_id, previous_mean_intensity)
                if result is not None:
                    result["source"] = "tribe_text"
                    result["video_used"] = False
                    result["fallback_reason"] = "no video provided" if not video_path else "video inference failed"
                    result["warnings"] = [
                        "TRIBE ran on transcript text only — not video.",
                        "Neural activation patterns are estimated from language, not audiovisual content.",
                    ]
                    if video_path and not video_exists:
                        result["warnings"].append(f"video_path provided but file not found: {video_path}")
                    return result

            # Real TRIBE completely failed
            fallback_reason = fallback_reason or "no usable input (no video, no transcript)"
            warnings.append("Real TRIBE unavailable. Falling back to content-driven heuristic.")

    else:
        # Not even trying real TRIBE
        fallback_reason = "USE_REAL_TRIBE=false (mock mode)"
        if video_path:
            warnings.append(
                "Video file was provided but USE_REAL_TRIBE=false. "
                "Video was NOT analyzed. Set USE_REAL_TRIBE=true to enable neural analysis."
            )

    # ── Mock / fallback path ──────────────────────────────────────────────
    source = "fallback" if USE_REAL_TRIBE else "mock"
    warnings.append(
        "Results are estimated from transcript content heuristics, not neural data. "
        "Different videos with similar transcripts may produce similar outputs."
    )

    result = _mock_intensity(
        transcript_text or "", segment_id, previous_mean_intensity, content_hints or {}
    )
    result["source"] = source
    result["video_used"] = False
    result["fallback_reason"] = fallback_reason
    result["warnings"] = warnings
    return result


# ---------------------------------------------------------------------------
# Real TRIBE v2 paths
# ---------------------------------------------------------------------------

def _try_real_tribe_video(model, video_path, segment_id, previous_mean):
    try:
        events_df = model.get_events_dataframe(video_path=video_path)
        result = model.predict(events=events_df)
        preds = result[0] if isinstance(result, tuple) else result
        out = _extract_features(preds, source="tribe_v2", previous_mean=previous_mean)
        return out
    except Exception as exc:
        logger.warning("tribe_service [%s]: video inference error — %s", segment_id, exc)
        return None


def _try_real_tribe_text(model, transcript_text, segment_id, previous_mean):
    try:
        import pandas as pd
        events_df = pd.DataFrame([{
            "type": "Text",
            "timeline": "lecture",
            "start": 0.0,
            "duration": max(10.0, len(transcript_text.split()) / 2.5),
            "text": transcript_text,
        }])
        result = model.predict(events=events_df)
        preds = result[0] if isinstance(result, tuple) else result
        return _extract_features(preds, source="tribe_text", previous_mean=previous_mean)
    except Exception as exc:
        logger.warning("tribe_service [%s]: text inference error — %s", segment_id, exc)
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
    try:
        if hasattr(preds, "detach"):
            preds = preds.detach().cpu().numpy()

        import numpy as np
        arr = np.abs(np.array(preds))

        if arr.ndim != 2 or arr.shape[0] == 0:
            return _empty_features(source)

        n_timesteps, n_vertices = arr.shape
        global_per_ts = arr.mean(axis=1)
        max_val = global_per_ts.max() or 1.0
        timeline = (global_per_ts / max_val).tolist()

        mean_val = float(global_per_ts.mean() / max_val)
        peak_val = float(global_per_ts.max() / max_val)
        relative_change = (mean_val - previous_mean) if previous_mean is not None else 0.0
        temporal_pattern = _classify_temporal_pattern(timeline)

        if n_vertices == 20484:
            region_activations = {}
            for name, slices in _APPROX_REGIONS.items():
                if slices is None:
                    region_activations[name] = round(mean_val * 0.6, 4)
                    continue
                lh_slice, rh_slice = slices
                val = float((arr[:, lh_slice].mean() + arr[:, rh_slice].mean()) / 2.0 / max_val)
                region_activations[name] = round(val, 4)
        else:
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
        "video_used":         False,
        "fallback_reason":    "empty prediction tensor",
        "warnings":           ["TRIBE returned empty predictions."],
    }


# ---------------------------------------------------------------------------
# Mock / content-driven path (improved variance)
# ---------------------------------------------------------------------------

def _text_hash_seed(text: str) -> float:
    """
    Deterministic but text-specific seed in [0, 1].
    Different transcripts → different seeds → different mock outputs.
    Prevents collapse to identical results for different inputs.
    """
    h = hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF


def _mock_intensity(text, segment_id, previous_mean, content_hints):
    """
    Content-driven mock with per-text variance.

    Key improvement: uses a hash of the transcript text as a deterministic
    seed so that different transcripts produce measurably different outputs,
    even when their heuristic difficulty levels are similar.
    """
    base = _heuristic_base(text, content_hints)
    seed = _text_hash_seed(text + segment_id)

    # Vary timeline length based on text length (8–16 points)
    word_count = len(text.split()) if text else 0
    n = max(8, min(16, word_count // 5 + 8))

    # Generate timeline with text-specific phase and amplitude variation
    phase = seed * math.pi * 2
    amp_var = 0.04 + 0.06 * seed  # amplitude varies per text
    freq_var = 1.2 + 0.8 * seed   # frequency varies per text

    timeline = []
    for i in range(n):
        t = i / max(n - 1, 1)
        # Base + sine with text-specific params + secondary harmonic
        val = base + amp_var * math.sin(t * math.pi * freq_var + phase)
        val += 0.03 * math.sin(t * math.pi * 3.7 + phase * 2.1)
        # Add slight trend based on content hints
        if content_hints.get("segment_type") == "derivation":
            val += 0.04 * t  # derivations tend to get harder
        elif content_hints.get("segment_type") == "example":
            val -= 0.03 * t  # examples tend to ease
        timeline.append(_clamp(val))

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
        "region_activations": _mock_region_activations(text, content_hints, mean_val, seed),
        "source":             "mock",
    }


def _mock_region_activations(text, hints, global_mean, seed):
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

    # Per-text perturbation so similar-difficulty texts don't collapse
    p = (seed - 0.5) * 0.12  # ±0.06 perturbation

    return {
        "language_network":  round(_clamp(0.35 + 0.25 * min(wc / 100, 1.0) + 0.15 * dv + p), 4),
        "prefrontal":        round(_clamp(0.25 + 0.35 * jd + 0.20 * ed + 0.15 * dv - p * 0.5), 4),
        "visual_cortex":     round(_clamp(0.18 + 0.15 * ed + p * 0.3), 4),
        "temporal_parietal": round(_clamp(den + p * 0.4), 4),
        "default_mode":      round(_clamp(0.25 + 0.35 * (1.0 - nv) + 0.15 * (1.0 - dv) - p), 4),
        "subcortical":       round(_clamp(0.18 + 0.25 * dv + 0.15 * nv + p * 0.6), 4),
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
    # Add text-length and unique-word variance
    unique_ratio = len(set(words)) / max(wc, 1)
    return _clamp(0.20 + 0.30 * jd + 0.15 * ls + db + 0.08 * unique_ratio, lo=0.15, hi=0.85)


def _clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))
