"""
fusion_service.py

Final fusion layer.

Takes:
- lecture_analysis (from lecture_analysis_service, including content_features)
- tribe_summary (from tribe_summary_service)
- mirofish_personas (from mirofish_service)

Produces:
- unified segment-level JSON for the frontend

Key improvements:
- Engagement and difficulty are independently scored
  (examples can be high engagement + medium difficulty;
   recaps can be low engagement + low difficulty)
- Evidence tracing per segment (content, TRIBE, persona signals)
- Confidence as a float (0-1) derived from signal agreement
- segment_type passed through to frontend
"""


def fuse(
    segment_id: str,
    time_range: dict,
    lecture_analysis: dict,
    tribe_summary: dict,
    mirofish_personas: dict,
) -> dict:
    classification = _classify_friction(lecture_analysis, tribe_summary, mirofish_personas)
    engagement_label = _classify_engagement(lecture_analysis, tribe_summary, mirofish_personas)
    friction_score = _compute_friction_score(lecture_analysis, tribe_summary, mirofish_personas)
    engagement_score = _compute_engagement_score(lecture_analysis, tribe_summary, mirofish_personas)
    confidence = _compute_confidence(lecture_analysis, tribe_summary, mirofish_personas)
    confidence_label = "high" if confidence >= 0.70 else ("medium" if confidence >= 0.40 else "low")
    role_flags = _assign_role_flags(classification, engagement_label, friction_score, engagement_score)
    most_affected = _find_most_affected(mirofish_personas)
    root_cause = _build_root_cause(classification, lecture_analysis, tribe_summary, most_affected)
    prereq = _suggest_prereq(lecture_analysis)
    action = _recommend_action(classification, engagement_label, lecture_analysis, tribe_summary)
    ui_explanation = _build_ui_explanation(classification, most_affected, lecture_analysis)

    content_factors = _content_factors(lecture_analysis)
    tribe_factors = _tribe_factors(tribe_summary)
    persona_factors = _persona_factors(mirofish_personas)

    # Evidence tracing — structured signals behind the scores
    evidence = _build_evidence(lecture_analysis, tribe_summary, mirofish_personas)

    return {
        "segment_id": segment_id,
        "time_range": f"{time_range.get('start', 0):.1f}s–{time_range.get('end', 0):.1f}s",
        "concept": _clean_concept_label(lecture_analysis.get("concept", ""), classification),
        "segment_type": lecture_analysis.get("segment_type", "definition"),
        "classification": classification,
        "engagement_label": engagement_label,
        "friction_score": round(friction_score, 3),
        "engagement_score": round(engagement_score, 3),
        "confidence": confidence_label,
        "confidence_score": round(confidence, 3),
        "segment_role_flags": role_flags,
        "root_cause": root_cause,
        "most_affected_persona": most_affected,
        "prerequisite_to_review": prereq,
        "recommended_action": action,
        "ui_explanation": ui_explanation,
        "supporting_factors": {
            "content_factors": content_factors,
            "tribe_factors": tribe_factors,
            "persona_factors": persona_factors,
        },
        "evidence": evidence,
    }


# ---------------------------------------------------------------------------
# Classification helpers
# ---------------------------------------------------------------------------

def _classify_friction(la: dict, tribe: dict, mf: dict) -> str:
    """Classify as easy | dense | confusing."""
    weak_persona = _get_persona(mf, "weak_background_student")
    avg_persona = _get_persona(mf, "average_student")

    weak_struggle = weak_persona.get("struggle_probability", 0.0) if weak_persona else 0.0
    avg_struggle = avg_persona.get("struggle_probability", 0.0) if avg_persona else 0.0
    tribe_intensity = tribe.get("neural_intensity", "medium")
    density = la.get("conceptual_density", "medium")
    difficulty = la.get("difficulty_level", "medium")

    if weak_struggle > 0.6 or (avg_struggle > 0.4 and tribe_intensity == "high"):
        return "confusing"
    elif density == "high" or (difficulty == "high" and tribe_intensity in ("medium", "high")):
        return "dense"
    return "easy"


def _classify_engagement(la: dict, tribe: dict, mf: dict) -> str:
    """Classify as low | medium | high."""
    score = _compute_engagement_score(la, tribe, mf)
    if score >= 0.60:
        return "high"
    elif score >= 0.35:
        return "medium"
    return "low"


# ---------------------------------------------------------------------------
# Scoring helpers — engagement and difficulty are INDEPENDENT
# ---------------------------------------------------------------------------

def _compute_friction_score(la: dict, tribe: dict, mf: dict) -> float:
    """
    Friction = how hard this segment is to process.
    Driven by: difficulty, density, symbolic load, TRIBE intensity, persona struggle.
    """
    diff_map = {"low": 0.2, "medium": 0.5, "high": 0.85}
    dense_map = {"low": 0.2, "medium": 0.5, "high": 0.85}
    intensity_map = {"low": 0.15, "medium": 0.45, "high": 0.80}

    cf = la.get("content_features", {})
    symbolic = cf.get("symbolic_density", 0.3)
    prereq = cf.get("prerequisite_load", 0.0)

    base = (
        0.20 * diff_map.get(la.get("difficulty_level", "medium"), 0.5)
        + 0.20 * dense_map.get(la.get("conceptual_density", "medium"), 0.5)
        + 0.15 * intensity_map.get(tribe.get("neural_intensity", "medium"), 0.45)
        + 0.15 * _mean_struggle(mf)
        + 0.15 * symbolic
        + 0.15 * prereq
    )

    # Segment type modifiers: examples reduce friction, derivations increase it
    seg_type = la.get("segment_type", "definition")
    if seg_type == "example":
        base *= 0.80  # examples are inherently less friction-inducing
    elif seg_type == "derivation":
        base *= 1.10  # derivations add friction even if difficulty is "medium"
    elif seg_type == "recap":
        base *= 0.65  # recaps are low friction by nature
    elif seg_type == "transition":
        base *= 0.70

    return _clamp(base)


def _compute_engagement_score(la: dict, tribe: dict, mf: dict) -> float:
    """
    Engagement = how much attention/interest this segment holds.
    INDEPENDENT from difficulty:
    - A worked example can be high engagement + medium difficulty
    - A repetitive recap can be low engagement + low difficulty
    - A dense derivation can be high difficulty + variable engagement
    """
    novelty_map = {"low": 0.15, "medium": 0.50, "high": 0.85}
    energy_map = {"low": 0.20, "medium": 0.55, "high": 0.85}

    cf = la.get("content_features", {})
    example_str = cf.get("example_strength", 0.0)
    seg_type = la.get("segment_type", "definition")

    # Base engagement from novelty + energy + persona engagement
    base = (
        0.25 * novelty_map.get(la.get("novelty_level", "medium"), 0.5)
        + 0.20 * energy_map.get(la.get("presentation_energy", "medium"), 0.5)
        + 0.30 * _mean_engagement(mf)
    )

    # Example boost — concrete examples are engaging regardless of difficulty
    base += 0.15 * example_str

    # TRIBE pattern contribution (spikes are noteworthy, not necessarily bad)
    pattern_map = {"stable": 0.0, "rising": 0.05, "spike": 0.10, "falling": -0.05, "fluctuating": 0.03}
    base += 0.10 * pattern_map.get(tribe.get("temporal_pattern", tribe.get("pattern", "stable")), 0.0)

    # Segment type adjustments
    if seg_type == "example":
        base += 0.08   # examples inherently engaging
    elif seg_type == "recap":
        base -= 0.10   # recaps inherently less engaging (familiar material)
    elif seg_type == "transition":
        base -= 0.06   # transitions are low-content
    elif seg_type == "intuition":
        base += 0.06   # intuition-building is engaging for most

    return _clamp(base)


def _compute_confidence(la: dict, tribe: dict, mf: dict) -> float:
    """
    Confidence as a float (0-1) based on signal agreement.
    High confidence = content analysis, TRIBE, and persona sim all agree.
    Low confidence = signals are contradictory or data is sparse.
    """
    scores = []

    # TRIBE confidence
    tribe_conf_map = {"low": 0.3, "medium": 0.6, "high": 0.9}
    scores.append(tribe_conf_map.get(tribe.get("tribe_confidence", "low"), 0.3))

    # Persona agreement: do all 3 personas tell a consistent story?
    personas = mf.get("personas", [])
    if len(personas) >= 3:
        struggles = [p.get("struggle_probability", 0.0) for p in personas]
        # If struggles are monotonically ordered (weak > avg > strong), that's consistent
        if struggles[0] >= struggles[1] >= struggles[2]:
            scores.append(0.8)
        else:
            scores.append(0.4)  # unexpected ordering = lower confidence
    else:
        scores.append(0.3)

    # Content signal richness: more content features = higher confidence
    cf = la.get("content_features", {})
    feature_count = sum(1 for v in cf.values() if isinstance(v, (int, float)) and v > 0)
    scores.append(min(0.9, feature_count * 0.15))

    # Signal agreement: do friction indicators and engagement indicators
    # point in consistent directions?
    difficulty = la.get("difficulty_level", "medium")
    engagement_persona = _mean_engagement(mf)
    if (difficulty == "high" and engagement_persona < 0.5) or \
       (difficulty == "low" and engagement_persona > 0.4):
        scores.append(0.8)  # consistent
    else:
        scores.append(0.5)  # ambiguous

    return sum(scores) / len(scores) if scores else 0.5


# ---------------------------------------------------------------------------
# Evidence tracing
# ---------------------------------------------------------------------------

def _build_evidence(la: dict, tribe: dict, mf: dict) -> dict:
    """
    Structured evidence trace for each segment.
    Shows exactly which signals drove the scores.
    """
    cf = la.get("content_features", {})

    content_signals = []
    if cf.get("symbolic_density", 0) > 0.3:
        content_signals.append(f"symbolic density: {cf['symbolic_density']:.0%}")
    if cf.get("example_strength", 0) > 0:
        content_signals.append(f"example markers present (strength: {cf['example_strength']:.0%})")
    elif la.get("difficulty_level") in ("medium", "high"):
        content_signals.append("no example markers detected")
    if cf.get("prerequisite_load", 0) > 0:
        prereqs = la.get("assumed_prerequisites", [])
        content_signals.append(f"prerequisites assumed: {', '.join(prereqs[:2]) if prereqs else 'yes'}")
    if cf.get("jargon_density", 0) > 0.3:
        content_signals.append(f"jargon density: {cf['jargon_density']:.0%}")
    content_signals.append(f"segment type: {la.get('segment_type', 'unknown')}")
    content_signals.append(f"pacing: {la.get('pacing', 'moderate')}")

    tribe_signals = []
    mean_int = tribe.get("mean_intensity", 0)
    if mean_int > 0:
        tribe_signals.append(f"mean intensity: {mean_int:.2f}")
    peak_int = tribe.get("peak_intensity", 0)
    if peak_int > 0:
        tribe_signals.append(f"peak intensity: {peak_int:.2f}")
    pattern = tribe.get("temporal_pattern", tribe.get("pattern", ""))
    if pattern:
        tribe_signals.append(f"temporal pattern: {pattern}")
    delta = tribe.get("delta_from_previous", 0)
    if abs(delta) > 0.05:
        tribe_signals.append(f"change from previous: {delta:+.2f}")

    persona_signals = []
    for p in mf.get("personas", []):
        name = p["persona"].replace("_", " ")
        sp = p.get("struggle_probability", 0)
        eng = p.get("mean_engagement", 0.5)
        persona_signals.append(f"{name}: {sp:.0%} struggle, {eng:.0%} engagement")

    return {
        "content_signals": content_signals,
        "tribe_signals": tribe_signals,
        "persona_signals": persona_signals,
    }


# ---------------------------------------------------------------------------
# Role flags
# ---------------------------------------------------------------------------

def _assign_role_flags(
    classification: str,
    engagement_label: str,
    friction_score: float,
    engagement_score: float,
) -> dict:
    return {
        "most_engaging_candidate": False,
        "least_engaging_candidate": False,
        "most_confusing_candidate": False,
        "most_review_needed_candidate": False,
    }


def assign_lecture_relative_flags(results: list) -> None:
    if not results:
        return

    by_eng_desc = sorted(results, key=lambda r: r.get("engagement_score", 0.0), reverse=True)
    by_eng_asc  = sorted(results, key=lambda r: r.get("engagement_score", 0.0))
    by_fric_desc = sorted(results, key=lambda r: r.get("friction_score", 0.0), reverse=True)

    top_engaging_id  = by_eng_desc[0]["segment_id"]
    top_friction_id  = by_fric_desc[0]["segment_id"]

    if top_engaging_id == top_friction_id and len(by_eng_desc) > 1:
        top_engaging_id = by_eng_desc[1]["segment_id"]

    least_engaging_id = by_eng_asc[0]["segment_id"]

    for r in results:
        sid = r["segment_id"]
        r["segment_role_flags"] = {
            "most_engaging_candidate":    sid == top_engaging_id,
            "least_engaging_candidate":   sid == least_engaging_id,
            "most_confusing_candidate":   sid == top_friction_id,
            "most_review_needed_candidate": sid == top_friction_id,
        }


# ---------------------------------------------------------------------------
# Explanation builders
# ---------------------------------------------------------------------------

def _find_most_affected(mf: dict) -> str:
    personas = mf.get("personas", [])
    if not personas:
        return ""
    worst = max(personas, key=lambda p: p.get("mean_confusion", 0.0) + (1 - p.get("mean_understanding", 1.0)))
    return worst.get("persona", "")


def _build_root_cause(classification: str, la: dict, tribe: dict, affected: str) -> str:
    persona_label = affected.replace("_", " ") if affected else "most learners"
    seg_type = la.get("segment_type", "")

    if classification == "confusing":
        factors = la.get("difficulty_factors", [])
        tribe_interp = tribe.get("tribe_interpretation", "")
        factor_str = "; ".join(factors) if factors else la.get("why_this_may_be_hard", "high density")
        type_note = f" Segment type: {seg_type}." if seg_type else ""
        return f"{persona_label.capitalize()} likely loses track here. {factor_str}. {tribe_interp}{type_note}"
    elif classification == "dense":
        return (
            f"High conceptual density ({la.get('conceptual_density', 'high')}) and "
            f"{la.get('pacing', 'fast')} pacing create processing pressure, "
            f"especially for {persona_label}. Segment type: {seg_type}."
        )
    return f"Segment is within manageable range for most personas. Type: {seg_type}."


def _suggest_prereq(la: dict) -> str:
    prereqs = la.get("assumed_prerequisites", [])
    if prereqs:
        return prereqs[0]
    return ""


def _recommend_action(classification: str, engagement_label: str, la: dict, tribe: dict) -> str:
    seg_type = la.get("segment_type", "")

    if classification == "confusing":
        if seg_type == "derivation":
            return "Break the derivation into smaller steps with a numeric example before the general case."
        if tribe.get("pattern") == "spike":
            return "Insert a brief pause or summary sentence before this segment to soften the cognitive load spike."
        cf = la.get("content_features", {})
        if cf.get("example_strength", 0) == 0:
            return "Add a concrete worked example before or immediately after introducing this concept."
        return "Add a worked example or visual anchor before introducing the key concept."
    elif classification == "dense":
        if la.get("pacing") == "fast":
            return "Reduce speech rate slightly and split the explanation into two shorter parts."
        return "Reduce on-screen text density and add a transitional recap sentence."
    elif engagement_label == "low":
        if seg_type == "recap":
            return "Transform this recap into a quick check — ask students to predict or recall before revealing."
        return "Increase presentational energy or add a concrete real-world hook to re-engage learners."
    return "Segment appears well-paced. Maintain current structure."


def _build_ui_explanation(classification: str, most_affected: str, la: dict) -> str:
    persona_label = most_affected.replace("_", " ") if most_affected else "weaker learners"
    concept = _clean_concept_label(la.get("concept", ""), classification)
    seg_type = la.get("segment_type", "")

    if classification == "confusing":
        if seg_type == "derivation":
            return f"Dense derivation — {concept} moves too fast for {persona_label} to follow step by step."
        return f"Students may get lost here — {concept} is introduced too quickly for {persona_label}."
    elif classification == "dense":
        return f"Dense segment — {concept} packs a lot in. {persona_label.capitalize()} may need to rewatch."
    if seg_type == "example":
        return f"{concept} — accessible worked example. Good recovery point for most learners."
    return f"{concept} — accessible for most learners."


def _clean_concept_label(concept: str, classification: str) -> str:
    _fallbacks = {"confusing": "this concept", "dense": "this step", "easy": "this segment"}
    if not concept:
        return _fallbacks.get(classification, "this segment")
    lower = concept.lower()
    if "heuristic" in lower or "unknown" in lower or "mode" in lower:
        return _fallbacks.get(classification, "this segment")
    return concept


# ---------------------------------------------------------------------------
# Supporting factor lists
# ---------------------------------------------------------------------------

def _content_factors(la: dict) -> list:
    factors = []
    if la.get("difficulty_level") == "high":
        factors.append("Difficulty: high")
    if la.get("conceptual_density") == "high":
        factors.append("Conceptual density: high")
    if la.get("pacing") == "fast":
        factors.append("Pacing: fast")
    if la.get("novelty_level") == "high":
        factors.append("Novelty: high — new concept introduced")
    seg_type = la.get("segment_type", "")
    if seg_type:
        factors.append(f"Segment type: {seg_type}")
    prereqs = la.get("assumed_prerequisites", [])
    if prereqs:
        factors.append(f"Assumes prior knowledge: {', '.join(prereqs[:2])}")
    cf = la.get("content_features", {})
    if cf.get("symbolic_density", 0) > 0.4:
        factors.append(f"High symbolic density ({cf['symbolic_density']:.0%})")
    if cf.get("example_strength", 0) > 0:
        factors.append("Contains concrete examples")
    elif la.get("difficulty_level") in ("medium", "high"):
        factors.append("No concrete examples present")
    return factors


def _tribe_factors(tribe: dict) -> list:
    factors = []
    if tribe.get("neural_intensity") == "high":
        factors.append(f"TRIBE: high cognitive intensity (mean={tribe.get('mean_intensity', 0):.2f})")
    if tribe.get("pattern") == "spike" or tribe.get("temporal_pattern") == "spike":
        factors.append(f"TRIBE: spike pattern detected (peak={tribe.get('peak_intensity', 0):.2f})")
    elif tribe.get("pattern") == "fluctuating" or tribe.get("temporal_pattern") == "fluctuating":
        factors.append("TRIBE: fluctuating signal — inconsistent cognitive demand")
    delta = tribe.get("delta_from_previous", 0.0)
    if abs(delta) > 0.15:
        direction = "increase" if delta > 0 else "decrease"
        factors.append(f"TRIBE: notable {direction} from previous segment (Δ={delta:+.2f})")
    return factors


def _persona_factors(mf: dict) -> list:
    factors = []
    for p in mf.get("personas", []):
        sp = p.get("struggle_probability", 0.0)
        if sp >= 0.4:
            name = p["persona"].replace("_", " ")
            factors.append(f"{name}: {int(sp*100)}% struggle probability")
    return factors


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def _mean_struggle(mf: dict) -> float:
    probs = [p.get("struggle_probability", 0.0) for p in mf.get("personas", [])]
    return sum(probs) / len(probs) if probs else 0.0


def _mean_engagement(mf: dict) -> float:
    vals = [p.get("mean_engagement", 0.5) for p in mf.get("personas", [])]
    return sum(vals) / len(vals) if vals else 0.5


def _get_persona(mf: dict, name: str) -> dict:
    for p in mf.get("personas", []):
        if p.get("persona") == name:
            return p
    return {}
