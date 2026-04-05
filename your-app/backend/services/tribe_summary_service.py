"""
tribe_summary_service.py

Converts raw TRIBE v2 output into a structured summary for the persona
simulation layer and the fusion layer.

Key corrections from TRIBE v2 paper:
  - Passes region_activations through (6 approximate functional groups)
  - Temporal pattern reflects actual trajectory (rising/falling/stable/spike)
  - relative_change is signed Δ vs previous segment (matching paper reporting)
  - No longer coarsens to high/medium/low only — passes float values to persona sim
"""

from typing import Optional


def summarize_tribe_output(
    tribe_output: dict,
    previous_mean_intensity: Optional[float] = None,
) -> dict:
    """
    Converts tribe_service output into a summary for consumption downstream.

    Args:
        tribe_output:            dict from tribe_service.get_tribe_intensity()
        previous_mean_intensity: kept for interface compat (already in tribe_output)

    Returns:
        tribe_summary dict
    """
    if not tribe_output or not tribe_output.get("timeline"):
        return _fallback_summary()

    mean_val          = tribe_output["mean_intensity"]
    peak_val          = tribe_output["peak_intensity"]
    relative_change   = tribe_output.get("relative_change", 0.0)
    temporal_pattern  = tribe_output.get("temporal_pattern", "stable")
    region_activations = tribe_output.get("region_activations", {})
    source            = tribe_output.get("source", "mock")

    neural_intensity  = _classify_intensity_level(mean_val)
    interpretation    = _build_interpretation(temporal_pattern, neural_intensity, relative_change)
    confidence        = _estimate_confidence(tribe_output.get("timeline", []), source)

    return {
        "mean_intensity":       mean_val,
        "peak_intensity":       peak_val,
        "relative_change":      relative_change,
        "temporal_pattern":     temporal_pattern,
        "neural_intensity":     neural_intensity,       # "low" | "medium" | "high"
        "region_activations":   region_activations,    # approximate, for persona sim + viz
        "tribe_interpretation": interpretation,
        "tribe_confidence":     confidence,
        "source":               source,
    }


def _classify_intensity_level(mean_val: float) -> str:
    if mean_val >= 0.65:
        return "high"
    elif mean_val >= 0.35:
        return "medium"
    return "low"


def _build_interpretation(pattern: str, level: str, delta: float) -> str:
    base = {
        ("spike",   "high"):   "Sudden high cognitive demand — attention fragmentation likely at this transition.",
        ("spike",   "medium"): "Moderate cognitive spike — some personas may lose track momentarily.",
        ("spike",   "low"):    "Minor spike in an otherwise low-demand segment.",
        ("rising",  "high"):   "Escalating high cognitive load — cumulative confusion risk for novices.",
        ("rising",  "medium"): "Gradually increasing demand — monitor for overload cliff.",
        ("rising",  "low"):    "Slowly increasing demand from a low baseline.",
        ("falling", "high"):   "Declining from peak load — potential recovery window emerging.",
        ("falling", "medium"): "Easing demand — good moment for consolidation.",
        ("falling", "low"):    "Demand tapering to low — boredom risk for advanced learners.",
        ("stable",  "high"):   "Sustained high cognitive demand — gradual confusion accumulation expected.",
        ("stable",  "medium"): "Sustained moderate demand — intermediate and novice learners remain engaged but strained.",
        ("stable",  "low"):    "Low stable cognitive demand — novices follow well; advanced learners may disengage.",
    }.get((pattern, level), "Neural activity pattern detected.")

    if delta > 0.20:
        base += f" Notable increase from previous segment (Δ=+{delta:.2f}) — may create a load cliff."
    elif delta < -0.20:
        base += f" Notable decrease from previous segment (Δ={delta:.2f}) — may signal a recovery window."

    return base


def _estimate_confidence(timeline: list, source: str) -> str:
    if source == "mock":
        return "low"
    if len(timeline) >= 10:
        return "high"
    elif len(timeline) >= 4:
        return "medium"
    return "low"


def _fallback_summary() -> dict:
    return {
        "mean_intensity":       0.0,
        "peak_intensity":       0.0,
        "relative_change":      0.0,
        "temporal_pattern":     "stable",
        "neural_intensity":     "low",
        "region_activations":   {
            "language_network":  0.0,
            "prefrontal":        0.0,
            "visual_cortex":     0.0,
            "temporal_parietal": 0.0,
            "default_mode":      0.0,
            "subcortical":       0.0,
        },
        "tribe_interpretation": "No TRIBE signal available for this segment.",
        "tribe_confidence":     "low",
        "source":               "mock",
    }
