// Verified JSON contract from /api/analyze-lecture
// This is the source of truth for frontend development until API is wired.

export interface Evidence {
  content_signals: string[]
  tribe_signals: string[]
  persona_signals: string[]
}

export interface Segment {
  segment_id: string
  time_range: string
  concept: string
  segment_type: string
  classification: string
  engagement_label: string
  friction_score: number
  engagement_score: number
  confidence: string
  confidence_score: number
  segment_role_flags: Record<string, boolean>
  root_cause: string
  most_affected_persona: string
  prerequisite_to_review: string
  recommended_action: string
  ui_explanation: string
  supporting_factors: {
    content_factors: string[]
    tribe_factors: string[]
    persona_factors: string[]
  }
  evidence: Evidence
}

export const MOCK_RESPONSE: {
  tribe_source: string
  lecture_summary: {
    total_segments: number
    most_confusing_segment: string
    most_confusing_time: string
    most_engaging_segment: string
    most_engaging_time: string
    least_engaging_segment: string
    least_engaging_time: string
    most_review_needed_segment: string
    most_review_needed_time: string
    average_friction: number
    average_engagement: number
    segment_type_distribution: Record<string, number>
  }
  segments: Segment[]
} = {
  tribe_source: "mock",
  lecture_summary: {
    total_segments: 5,
    most_confusing_segment: "seg_003",
    most_confusing_time: "32.0s–48.0s",
    most_engaging_segment: "seg_004",
    most_engaging_time: "48.0s–62.0s",
    least_engaging_segment: "seg_001",
    least_engaging_time: "0.0s–14.0s",
    most_review_needed_segment: "seg_003",
    most_review_needed_time: "32.0s–48.0s",
    average_friction: 0.392,
    average_engagement: 0.426,
    segment_type_distribution: {
      transition: 1,
      derivation: 2,
      example: 1,
      definition: 1,
    },
  },
  segments: [
    {
      segment_id: "seg_001",
      time_range: "0.0s–14.0s",
      concept: "Introduction to Neural Networks",
      segment_type: "transition",
      classification: "confusing",
      engagement_label: "low",
      friction_score: 0.328,
      engagement_score: 0.302,
      confidence: "medium",
      confidence_score: 0.52,
      segment_role_flags: {
        most_engaging_candidate: false,
        least_engaging_candidate: true,
        most_confusing_candidate: false,
        most_review_needed_candidate: false,
      },
      root_cause:
        "Weak background student likely loses track here. No concrete hook — default-mode network active, students mentally elsewhere. Sustained moderate demand — intermediate and novice learners remain engaged but strained. Segment type: transition.",
      most_affected_persona: "weak_background_student",
      prerequisite_to_review: "",
      recommended_action:
        "Increase presentational energy or add a concrete real-world hook to re-engage learners.",
      ui_explanation:
        "Students may get lost here — Introduction to Neural Networks is introduced too quickly for weak background students.",
      supporting_factors: {
        content_factors: [
          "Segment type: transition",
          "No concrete examples present",
        ],
        tribe_factors: [],
        persona_factors: ["weak background student: 100% struggle probability"],
      },
      evidence: {
        content_signals: [
          "no example markers detected",
          "segment type: transition",
          "pacing: slow",
        ],
        tribe_signals: [
          "mean intensity: 0.37",
          "temporal pattern: stable",
        ],
        persona_signals: [
          "weak background student: 100% struggle, 55% engagement",
          "average student: 0% struggle, 68% engagement",
          "strong student: 0% struggle, 52% engagement",
        ],
      },
    },
    {
      segment_id: "seg_002",
      time_range: "14.0s–32.0s",
      concept: "Gradient Descent: θ = θ - α∇L(θ)",
      segment_type: "derivation",
      classification: "confusing",
      engagement_label: "medium",
      friction_score: 0.502,
      engagement_score: 0.388,
      confidence: "medium",
      confidence_score: 0.62,
      segment_role_flags: {
        most_engaging_candidate: false,
        least_engaging_candidate: false,
        most_confusing_candidate: false,
        most_review_needed_candidate: false,
      },
      root_cause:
        "Weak background student likely loses track here. High symbolic density (72%) exceeds this persona's tolerance; no concrete examples to anchor understanding. Sustained high cognitive demand — personas may accumulate confusion gradually. Segment type: derivation.",
      most_affected_persona: "weak_background_student",
      prerequisite_to_review: "multivariable calculus",
      recommended_action:
        "Break the derivation into smaller steps with a numeric example before the general case.",
      ui_explanation:
        "Dense derivation — Gradient Descent moves too fast for weak background students to follow step by step.",
      supporting_factors: {
        content_factors: [
          "Difficulty: high",
          "Segment type: derivation",
          "Assumes prior knowledge: multivariable calculus",
          "High symbolic density (72%)",
          "No concrete examples present",
        ],
        tribe_factors: [
          "TRIBE: high cognitive intensity (mean=0.69)",
          "TRIBE: notable increase from previous segment (Δ=+0.32)",
        ],
        persona_factors: ["weak background student: 100% struggle probability"],
      },
      evidence: {
        content_signals: [
          "symbolic density: 72%",
          "no example markers detected",
          "prerequisites assumed: multivariable calculus",
          "jargon density: 60%",
          "segment type: derivation",
          "pacing: moderate",
        ],
        tribe_signals: [
          "mean intensity: 0.69",
          "peak intensity: 0.82",
          "temporal pattern: rising",
          "change from previous: +0.32",
        ],
        persona_signals: [
          "weak background student: 100% struggle, 48% engagement",
          "average student: 27% struggle, 58% engagement",
          "strong student: 0% struggle, 55% engagement",
        ],
      },
    },
    {
      segment_id: "seg_003",
      time_range: "32.0s–48.0s",
      concept: "Backpropagation and the Chain Rule",
      segment_type: "derivation",
      classification: "confusing",
      engagement_label: "low",
      friction_score: 0.618,
      engagement_score: 0.318,
      confidence: "high",
      confidence_score: 0.74,
      segment_role_flags: {
        most_engaging_candidate: false,
        least_engaging_candidate: false,
        most_confusing_candidate: true,
        most_review_needed_candidate: true,
      },
      root_cause:
        "Weak background student likely loses track here. High jargon density; multiple concepts in short span; high symbolic density (65%) exceeds tolerance; segment assumes prior knowledge this persona lacks. Sustained high cognitive demand. Segment type: derivation.",
      most_affected_persona: "weak_background_student",
      prerequisite_to_review: "calculus (derivatives)",
      recommended_action:
        "Break the derivation into smaller steps with a numeric example before the general case.",
      ui_explanation:
        "Dense derivation — Backpropagation and the Chain Rule moves too fast for weak background students to follow step by step.",
      supporting_factors: {
        content_factors: [
          "Difficulty: high",
          "Conceptual density: high",
          "Segment type: derivation",
          "Assumes prior knowledge: calculus (derivatives)",
          "High symbolic density (65%)",
          "No concrete examples present",
        ],
        tribe_factors: [
          "TRIBE: high cognitive intensity (mean=0.68)",
          "TRIBE: notable increase from previous segment (Δ=+0.22)",
        ],
        persona_factors: ["weak background student: 100% struggle probability"],
      },
      evidence: {
        content_signals: [
          "symbolic density: 65%",
          "no example markers detected",
          "prerequisites assumed: calculus (derivatives)",
          "jargon density: 80%",
          "segment type: derivation",
          "pacing: fast",
        ],
        tribe_signals: [
          "mean intensity: 0.68",
          "peak intensity: 0.85",
          "temporal pattern: spike",
          "change from previous: +0.22",
        ],
        persona_signals: [
          "weak background student: 100% struggle, 38% engagement",
          "average student: 40% struggle, 50% engagement",
          "strong student: 0% struggle, 48% engagement",
        ],
      },
    },
    {
      segment_id: "seg_004",
      time_range: "48.0s–62.0s",
      concept: "Single Neuron Example: σ(wx + b)",
      segment_type: "example",
      classification: "easy",
      engagement_label: "high",
      friction_score: 0.177,
      engagement_score: 0.628,
      confidence: "high",
      confidence_score: 0.78,
      segment_role_flags: {
        most_engaging_candidate: true,
        least_engaging_candidate: false,
        most_confusing_candidate: false,
        most_review_needed_candidate: false,
      },
      root_cause:
        "Segment is within manageable range for most personas. Type: example.",
      most_affected_persona: "weak_background_student",
      prerequisite_to_review: "",
      recommended_action:
        "Segment appears well-paced. Maintain current structure.",
      ui_explanation:
        "Single Neuron Example: σ(wx + b) — accessible worked example. Good recovery point for most learners.",
      supporting_factors: {
        content_factors: [
          "Novelty: high — new concept introduced",
          "Segment type: example",
          "Contains concrete examples",
        ],
        tribe_factors: [
          "TRIBE: notable decrease from previous segment (Δ=-0.33)",
        ],
        persona_factors: [],
      },
      evidence: {
        content_signals: [
          "example markers present (strength: 67%)",
          "segment type: example",
          "pacing: moderate",
        ],
        tribe_signals: [
          "mean intensity: 0.35",
          "peak intensity: 0.42",
          "temporal pattern: falling",
          "change from previous: -0.33",
        ],
        persona_signals: [
          "weak background student: 7% struggle, 78% engagement",
          "average student: 0% struggle, 72% engagement",
          "strong student: 0% struggle, 55% engagement",
        ],
      },
    },
    {
      segment_id: "seg_005",
      time_range: "62.0s–75.0s",
      concept: "Vanishing Gradient Problem",
      segment_type: "definition",
      classification: "confusing",
      engagement_label: "medium",
      friction_score: 0.335,
      engagement_score: 0.412,
      confidence: "medium",
      confidence_score: 0.56,
      segment_role_flags: {
        most_engaging_candidate: false,
        least_engaging_candidate: false,
        most_confusing_candidate: false,
        most_review_needed_candidate: false,
      },
      root_cause:
        "Weak background student likely loses track here. Sustained moderate demand — intermediate and novice learners remain engaged but strained. Significant increase from previous segment — may create a load cliff. Segment type: definition.",
      most_affected_persona: "weak_background_student",
      prerequisite_to_review: "calculus (derivatives)",
      recommended_action:
        "Add a concrete worked example before or immediately after introducing this concept.",
      ui_explanation:
        "Students may get lost here — Vanishing Gradient Problem is introduced too quickly for weak background students.",
      supporting_factors: {
        content_factors: [
          "Segment type: definition",
          "Assumes prior knowledge: calculus (derivatives)",
          "No concrete examples present",
        ],
        tribe_factors: [
          "TRIBE: notable increase from previous segment (Δ=+0.28)",
        ],
        persona_factors: ["weak background student: 100% struggle probability"],
      },
      evidence: {
        content_signals: [
          "no example markers detected",
          "prerequisites assumed: calculus (derivatives)",
          "jargon density: 40%",
          "segment type: definition",
          "pacing: moderate",
        ],
        tribe_signals: [
          "mean intensity: 0.55",
          "peak intensity: 0.62",
          "temporal pattern: rising",
          "change from previous: +0.28",
        ],
        persona_signals: [
          "weak background student: 100% struggle, 58% engagement",
          "average student: 3% struggle, 62% engagement",
          "strong student: 0% struggle, 50% engagement",
        ],
      },
    },
  ],
}
