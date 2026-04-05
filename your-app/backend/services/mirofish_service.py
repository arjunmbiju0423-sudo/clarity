"""
mirofish_service.py  (Learner Persona Simulation Engine)

Standalone heuristic simulation engine that consumes:
  - lecture_analysis (including content_features vector)
  - TRIBE region activations

Content-aware: persona behavior now depends on actual content signals
(symbolic density, example presence, pace, prerequisite load, transitions)
rather than just a single difficulty number.
"""

import random
from typing import Optional

PERSONA_PROFILES = {
    "weak_background_student": {
        "prior_knowledge":                0.15,
        "wm_capacity":                    0.30,
        "dmn_susceptibility":             0.30,
        "stress_sensitivity":             0.80,
        "language_processing_efficiency": 0.40,
        "jargon_sensitivity":             0.90,
        "concept_density_sensitivity":    0.85,
        "example_gain":                   0.85,
        "confusion_persistence":          0.75,
        "recovery_rate":                  0.25,
        "boredom_risk":                   0.10,
        "initial_understanding":          0.20,
        "initial_confusion":              0.15,
        "initial_attention":              0.80,
        "initial_engagement":             0.65,
        "initial_fatigue":                0.00,
        # Content feature sensitivities
        "symbol_tolerance":               0.20,   # can't parse much notation
        "prereq_penalty":                 0.85,   # suffers when prerequisites assumed
        "pace_tolerance":                 0.30,   # needs slow pace
        "transition_benefit":             0.70,   # benefits greatly from smooth transitions
    },
    "average_student": {
        "prior_knowledge":                0.50,
        "wm_capacity":                    0.55,
        "dmn_susceptibility":             0.45,
        "stress_sensitivity":             0.45,
        "language_processing_efficiency": 0.65,
        "jargon_sensitivity":             0.50,
        "concept_density_sensitivity":    0.50,
        "example_gain":                   0.60,
        "confusion_persistence":          0.45,
        "recovery_rate":                  0.50,
        "boredom_risk":                   0.25,
        "initial_understanding":          0.50,
        "initial_confusion":              0.08,
        "initial_attention":              0.75,
        "initial_engagement":             0.60,
        "initial_fatigue":                0.00,
        "symbol_tolerance":               0.50,
        "prereq_penalty":                 0.50,
        "pace_tolerance":                 0.55,
        "transition_benefit":             0.40,
    },
    "strong_student": {
        "prior_knowledge":                0.85,
        "wm_capacity":                    0.85,
        "dmn_susceptibility":             0.65,
        "stress_sensitivity":             0.15,
        "language_processing_efficiency": 0.90,
        "jargon_sensitivity":             0.15,
        "concept_density_sensitivity":    0.20,
        "example_gain":                   0.30,
        "confusion_persistence":          0.15,
        "recovery_rate":                  0.85,
        "boredom_risk":                   0.75,
        "initial_understanding":          0.78,
        "initial_confusion":              0.03,
        "initial_attention":              0.72,
        "initial_engagement":             0.58,
        "initial_fatigue":                0.00,
        "symbol_tolerance":               0.90,
        "prereq_penalty":                 0.10,
        "pace_tolerance":                 0.85,
        "transition_benefit":             0.15,
    },
}

NUM_RUNS  = 30
NOISE_STD = 0.05


def simulate_personas(
    lecture_analysis: dict,
    tribe_summary: dict,
    segment_id: str = "",
) -> dict:
    results = []
    for persona_name, base_params in PERSONA_PROFILES.items():
        result = _run_persona_simulation(
            persona_name, base_params, lecture_analysis, tribe_summary
        )
        results.append(result)
    return {"personas": results}


def _run_persona_simulation(persona_name, base_params, lecture_analysis, tribe_summary):
    all_runs = []
    for _ in range(NUM_RUNS):
        p = _sample_params(base_params)
        run = _single_run(p, lecture_analysis, tribe_summary)
        all_runs.append(run)

    mean_u = _mean([r["understanding_final"] for r in all_runs])
    mean_c = _mean([r["confusion_final"]     for r in all_runs])
    mean_a = _mean([r["attention_final"]     for r in all_runs])
    mean_e = _mean([r["engagement_final"]    for r in all_runs])
    struggle_prob = sum(1 for r in all_runs if r["failed"]) / NUM_RUNS

    return {
        "persona":              persona_name,
        "understanding":        _level(mean_u),
        "failure_point":        _describe_failure(persona_name, mean_c, struggle_prob, lecture_analysis, tribe_summary),
        "reason":               _describe_reason(persona_name, base_params, lecture_analysis, tribe_summary),
        "attention_state":      _level(mean_a),
        "engagement_reason":    _describe_engagement(persona_name, base_params, mean_e, lecture_analysis, tribe_summary),
        "struggle_probability": round(struggle_prob, 3),
        "mean_understanding":   round(mean_u, 3),
        "mean_confusion":       round(mean_c, 3),
        "mean_attention":       round(mean_a, 3),
        "mean_engagement":      round(mean_e, 3),
    }


def _single_run(p, la, tribe):
    U = p["initial_understanding"]
    C = p["initial_confusion"]
    A = p["initial_attention"]
    E = p["initial_engagement"]
    F = p["initial_fatigue"]

    # TRIBE region activations
    regions   = tribe.get("region_activations", {})
    lang_load = regions.get("language_network",  0.4)
    pfc_load  = regions.get("prefrontal",         0.4)
    dmn_load  = regions.get("default_mode",       0.3)
    sub_load  = regions.get("subcortical",        0.25)
    tp_load   = regions.get("temporal_parietal",  0.45)

    # Content features (new: drive persona behavior from actual content)
    cf = la.get("content_features", {})
    sym_density    = cf.get("symbolic_density",      0.3)
    example_str    = cf.get("example_strength",      0.0)
    transition_sm  = cf.get("transition_smoothness", 0.0)
    prereq_load    = cf.get("prerequisite_load",     0.0)
    pace_pressure  = cf.get("pace_pressure",         0.5)
    jargon_density = cf.get("jargon_density",        0.3)
    seg_type       = cf.get("segment_type",          "definition")

    # ── Compute content-aware difficulty ──────────────────────────────────
    # Symbol strain: how much this persona struggles with notation
    symbol_strain = sym_density * (1.0 - p.get("symbol_tolerance", 0.5))

    # Prerequisite gap: how much assumed knowledge this persona lacks
    prereq_gap = prereq_load * p.get("prereq_penalty", 0.5)

    # Pace overload: fast pace exceeds processing capacity
    pace_overload = max(0.0, pace_pressure - p.get("pace_tolerance", 0.5))

    # Jargon load (existing, but now driven by measured density)
    jargon_load = jargon_density * p["jargon_sensitivity"]

    # Conceptual density load
    density_map = {"low": 0.2, "medium": 0.55, "high": 0.85}
    density_load = p["concept_density_sensitivity"] * density_map.get(
        la.get("conceptual_density", "medium"), 0.5
    )

    # TRIBE intensity contribution
    intensity_map = {"low": 0.15, "medium": 0.45, "high": 0.80}
    tribe_load = intensity_map.get(tribe.get("neural_intensity", "medium"), 0.45)

    # Weighted difficulty — multi-signal, not just a single number
    difficulty = _clamp(
        0.20 * density_load
        + 0.20 * jargon_load
        + 0.15 * symbol_strain
        + 0.15 * prereq_gap
        + 0.10 * pace_overload
        + 0.20 * tribe_load
    )

    # ── Compute content-aware support ────────────────────────────────────
    # Examples: high gain for novices, moderate for average, low for advanced
    example_support = example_str * p["example_gain"]

    # Transitions: smooth transitions reduce confusion accumulation
    transition_support = transition_sm * p.get("transition_benefit", 0.4)

    # Energy: presentation energy helps engagement
    energy_map = {"low": 0.2, "medium": 0.5, "high": 0.8}
    energy = energy_map.get(la.get("presentation_energy", "medium"), 0.5)

    support = _clamp(
        0.40 * example_support
        + 0.25 * transition_support
        + 0.35 * energy
    )

    # ── Segment type modifiers ────────────────────────────────────────────
    # Different segment types affect personas differently
    type_eng_mod = 0.0   # engagement modifier
    type_diff_mod = 0.0  # difficulty modifier

    if seg_type == "example":
        # Examples: boost engagement for novice, may bore advanced
        type_eng_mod = 0.12 * p["example_gain"] - 0.06 * p["boredom_risk"]
        type_diff_mod = -0.08  # examples reduce difficulty
    elif seg_type == "derivation":
        # Derivations: high difficulty, engagement depends on tolerance
        type_diff_mod = 0.10 * (1.0 - p.get("symbol_tolerance", 0.5))
        type_eng_mod = -0.05 * (1.0 - p.get("symbol_tolerance", 0.5))
    elif seg_type == "recap":
        # Recap: low difficulty, but boredom risk for advanced
        type_diff_mod = -0.12
        type_eng_mod = -0.10 * p["boredom_risk"]
    elif seg_type == "transition":
        # Transition: natural pause, slight engagement dip
        type_diff_mod = -0.06
        type_eng_mod = -0.04
    elif seg_type == "intuition":
        # Intuition building: accessible, engages novices
        type_diff_mod = -0.06
        type_eng_mod = 0.08 * (1.0 - p["prior_knowledge"])

    difficulty = _clamp(difficulty + type_diff_mod)
    novelty = _novelty(la)
    boredom = p["boredom_risk"] * (1.0 - novelty)
    overload = max(0.0, difficulty - support)

    # ── TRIBE-derived neural effects ──────────────────────────────────────
    wm_pressure         = pfc_load * (1.0 - p["wm_capacity"])
    lang_strain         = lang_load * (1.0 - p["language_processing_efficiency"])
    dmn_effect          = dmn_load * p["dmn_susceptibility"]
    stress_effect       = sub_load * p["stress_sensitivity"]
    comprehension_bonus = tp_load * (1.0 - abs(tp_load - 0.5) * 2) * 0.3

    # ── State updates ─────────────────────────────────────────────────────
    U = _clamp(U + 0.20 * support + 0.10 * comprehension_bonus
                 - 0.18 * difficulty - 0.12 * C - 0.10 * wm_pressure)
    C = _clamp(C + 0.20 * difficulty + 0.15 * lang_strain + 0.12 * stress_effect
                 - 0.15 * support - 0.08 * transition_support)
    A = _clamp(A - 0.15 * difficulty - 0.18 * dmn_effect - 0.08 * F
                 + 0.12 * novelty + 0.10 * support)
    E = _clamp(E + 0.10 * novelty + 0.12 * support - 0.18 * overload
                 - 0.15 * boredom - 0.10 * dmn_effect + type_eng_mod)
    F = _clamp(F + 0.12 * difficulty + 0.08 * wm_pressure)

    failed = C > 0.75 or U < 0.25 or A < 0.20

    return {
        "understanding_final": U,
        "confusion_final":     C,
        "attention_final":     A,
        "engagement_final":    E,
        "fatigue_final":       F,
        "failed":              failed,
    }


def _novelty(la):
    return {"low": 0.15, "medium": 0.5, "high": 0.85}.get(la.get("novelty_level", "medium"), 0.5)


def _sample_params(base):
    return {
        k: _clamp(v + random.gauss(0, NOISE_STD)) if isinstance(v, float) and not k.startswith("initial_") else v
        for k, v in base.items()
    }


def _clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))


def _mean(vals):
    return sum(vals) / len(vals) if vals else 0.0


def _level(v):
    return "high" if v >= 0.60 else ("medium" if v >= 0.35 else "low")


def _describe_failure(persona, mean_c, struggle_prob, la, tribe):
    if struggle_prob < 0.20:
        return ""
    pct = int(struggle_prob * 100)
    seg_type = la.get("segment_type", la.get("content_features", {}).get("segment_type", ""))
    type_note = f" Segment type: {seg_type}." if seg_type else ""
    return (
        f"{pct}% of {persona.replace('_', ' ')} simulations entered a struggle state. "
        f"Conceptual density is {la.get('conceptual_density','medium')}; "
        f"TRIBE signal is {tribe.get('temporal_pattern','stable')}.{type_note}"
    )


def _describe_reason(persona, p, la, tribe):
    factors = []
    cf = la.get("content_features", {})

    if la.get("difficulty_level") == "high":
        factors.append("high content difficulty")
    if cf.get("symbolic_density", 0) > 0.5 and p.get("symbol_tolerance", 0.5) < 0.5:
        factors.append(f"high symbolic density ({cf['symbolic_density']:.0%}) exceeds this persona's tolerance")
    if cf.get("prerequisite_load", 0) > 0.3 and p.get("prereq_penalty", 0.5) > 0.5:
        factors.append("segment assumes prior knowledge this persona lacks")
    if la.get("conceptual_density") == "high" and p["concept_density_sensitivity"] > 0.6:
        factors.append("dense concept introduction")
    if la.get("pacing") == "fast" and p.get("pace_tolerance", 0.5) < 0.5:
        factors.append("fast pacing exceeds processing tolerance")
    if cf.get("example_strength", 0) == 0 and la.get("difficulty_level") in ("medium", "high"):
        factors.append("no concrete examples to anchor understanding")

    r = tribe.get("region_activations", {})
    if r.get("prefrontal", 0) > 0.65:
        factors.append("high working memory demand (prefrontal signal)")
    if r.get("language_network", 0) > 0.70 and p["language_processing_efficiency"] < 0.5:
        factors.append("heavy language processing load")
    if r.get("default_mode", 0) > 0.60:
        factors.append("elevated mind-wandering signal (default mode network)")
    if tribe.get("temporal_pattern") in ("spike", "rising"):
        factors.append(f"TRIBE-detected {tribe['temporal_pattern']} cognitive load")

    if not factors:
        factors.append("moderate challenge well within this persona's tolerance")
    return "; ".join(factors).capitalize() + "."


def _describe_engagement(persona, p, mean_e, la, tribe):
    cf = la.get("content_features", {})
    seg_type = cf.get("segment_type", "")
    dmn = tribe.get("region_activations", {}).get("default_mode", 0.3)

    if persona == "strong_student" and seg_type == "recap":
        return "Recap segment with low novelty triggers boredom risk for advanced learners."
    if persona == "strong_student" and la.get("novelty_level") == "low":
        return "Low novelty triggers boredom risk for this persona despite manageable difficulty."
    if persona == "weak_background_student" and seg_type == "example":
        return "Concrete example provides an accessible anchor — engagement boosted for novice learners."
    if dmn > 0.60:
        return "Elevated default mode signal suggests mind-wandering risk — engagement suppressed."
    if mean_e > 0.60:
        return "High engagement driven by novelty and appropriate challenge level."
    if mean_e < 0.35:
        return "Low engagement — cognitive overload or insufficient novelty suppresses attention."
    return "Moderate engagement maintained; no strong pull toward either extreme."
