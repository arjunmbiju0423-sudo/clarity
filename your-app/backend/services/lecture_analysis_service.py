"""
lecture_analysis_service.py

Analyzes a single lecture segment for:
- concept identification (slide title > named entity > tech phrase > noun phrase)
- segment_type classification (definition, example, derivation, recap, transition, intuition)
- difficulty level, pacing, conceptual density
- content feature vector for persona simulation
- novelty, presentation energy

Uses Claude via the Anthropic API.
Falls back to a heuristic rule engine if no API key is present.
"""

import os
import re
import json
from typing import Optional

# ---------------------------------------------------------------------------
# Shared constants
# ---------------------------------------------------------------------------

_STOPWORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'now', 'let', 'we', 'us',
    'i', 'you', 'they', 'it', 'this', 'that', 'these', 'those', 'so',
    'if', 'when', 'then', 'also', 'just', 'very', 'quite', 'going', 'look',
    'today', 'going', 'start', 'talk', 'about', 'see', 'here', 'there',
}

# Ordered from most specific to most general — first match wins
_TECH_PHRASES = [
    "gradient descent", "stochastic gradient descent", "backpropagation",
    "chain rule", "vanishing gradient", "exploding gradient", "loss function",
    "activation function", "sigmoid function", "relu activation",
    "neural network", "deep neural network", "convolutional neural network",
    "recurrent neural network", "transformer architecture", "attention mechanism",
    "self-attention", "cross-entropy", "mean squared error", "overfitting",
    "regularization", "dropout", "batch normalization", "learning rate",
    "weight initialization", "forward pass", "backward pass",
    "eigenvalue", "eigenvector", "matrix multiplication", "dot product",
    "taylor series", "fourier transform", "convolution", "entropy",
    "bayes theorem", "maximum likelihood", "expectation maximization",
]

# ---------------------------------------------------------------------------
# Segment type marker sets
# ---------------------------------------------------------------------------

_DEFINITION_MARKERS = [
    "is defined as", "are defined as", "means that", "is called",
    "we define", "definition", "formally,", "we say that", "denoted by",
    "let us define", "we introduce", "is known as",
]
_EXAMPLE_MARKERS = [
    "for example", "for instance", "suppose", "consider", "let us look",
    "imagine", "think of", "as an example", "concretely", "let's say",
    "say we have", "take the case", "let x be", "let's work through",
    "worked example", "let me show", "plug in", "if we plug",
]
_DERIVATION_MARKERS = [
    "it follows that", "therefore", "thus we get", "we can derive",
    "by substituting", "applying the", "taking the derivative",
    "differentiate", "integrate", "expanding", "simplifying",
    "from equation", "substituting into", "rearranging", "proof",
    "we can show", "combining these", "by induction",
]
_RECAP_MARKERS = [
    "to summarize", "in summary", "to recap", "as we saw", "recall that",
    "we already", "as mentioned", "going back to", "remember that",
    "we said earlier", "to review", "briefly,", "so far we",
    "last time", "previously", "as before",
]
_TRANSITION_MARKERS = [
    "moving on", "next we", "now let's", "turning to", "shifting to",
    "the next topic", "let's move", "with that in mind", "building on",
    "now that we have", "having established", "let's turn",
    "so now", "okay so", "all right so",
]
_INTUITION_MARKERS = [
    "the intuition is", "intuitively", "the idea is", "think of it as",
    "you can think of", "the key insight", "the reason is",
    "what this means is", "in plain english", "in simple terms",
    "the big picture", "why does this matter", "conceptually",
    "at a high level", "the core idea",
]

# ---------------------------------------------------------------------------
# Anthropic
# ---------------------------------------------------------------------------

try:
    import anthropic
    _ANTHROPIC_AVAILABLE = True
except ImportError:
    _ANTHROPIC_AVAILABLE = False

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

ANALYSIS_SYSTEM_PROMPT = """
You are an educational content analysis engine.
Given a lecture segment, analyze it and return a JSON object with these exact fields:

{
  "concept": "short concept name",
  "summary": "1-sentence summary of what is being taught",
  "segment_type": "definition" | "example" | "derivation" | "recap" | "transition" | "intuition",
  "is_new_concept": true or false,
  "difficulty_level": "low" | "medium" | "high",
  "conceptual_density": "low" | "medium" | "high",
  "pacing": "slow" | "moderate" | "fast",
  "difficulty_factors": ["list", "of", "specific", "reasons"],
  "assumed_prerequisites": ["list of prior knowledge assumed"],
  "why_this_may_be_hard": "specific explanation",
  "exam_importance": "low" | "medium" | "high",
  "novelty_level": "low" | "medium" | "high",
  "presentation_energy": "low" | "medium" | "high",
  "symbolic_density": 0.0 to 1.0,
  "has_examples": true or false,
  "has_transitions": true or false
}

Segment type rules:
- "definition": introduces or formally defines a term/concept
- "example": walks through a concrete case, worked problem, or illustration
- "derivation": proves, derives, or transforms mathematical/logical expressions
- "recap": reviews previously covered material
- "transition": bridges between topics with little new content
- "intuition": builds conceptual understanding without formalism

Be conservative and specific. Return only valid JSON, no other text.
""".strip()


def analyze_segment(
    transcript_segment: str,
    slide_text: str = "",
    visual_context: str = "",
    segment_id: str = "",
) -> dict:
    if _ANTHROPIC_AVAILABLE and ANTHROPIC_API_KEY:
        result = _analyze_with_llm(transcript_segment, slide_text, visual_context)
        result["_llm_used"] = True
    else:
        result = _analyze_heuristic(transcript_segment, slide_text)
        result["_llm_used"] = False

    # Always compute content_features for persona simulation
    result["content_features"] = _extract_content_features(transcript_segment, slide_text, result)
    return result


def _analyze_with_llm(transcript: str, slide_text: str, visual_context: str) -> dict:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    user_content = f"TRANSCRIPT:\n{transcript}"
    if slide_text:
        user_content += f"\n\nSLIDE TEXT:\n{slide_text}"
    if visual_context:
        user_content += f"\n\nVISUAL CONTEXT:\n{visual_context}"

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=ANALYSIS_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )
    raw = message.content[0].text.strip()
    return json.loads(raw)


def _analyze_heuristic(transcript: str, slide_text: str) -> dict:
    """Rule-based fallback when no LLM is available."""
    text = (transcript + " " + slide_text).lower()
    word_count = len(transcript.split())

    # --- Jargon / complexity signals ---
    technical_markers = [
        "algorithm", "theorem", "derivative", "integral", "matrix", "recursion",
        "complexity", "entropy", "gradient", "convolution", "hypothesis", "coefficient",
        "asymptotic", "eigenvalue", "polynomial", "probabilistic", "stochastic",
        "neural", "backpropagation", "transformer", "embedding",
    ]
    jargon_count = sum(1 for t in technical_markers if t in text)

    # --- Difficulty ---
    if jargon_count >= 5 or word_count > 120:
        difficulty = "high"
    elif jargon_count >= 2 or word_count > 60:
        difficulty = "medium"
    else:
        difficulty = "low"

    # --- Conceptual density ---
    density_ratio = jargon_count / max(word_count / 50, 1)
    if density_ratio >= 2.5:
        conceptual_density = "high"
    elif density_ratio >= 1.0:
        conceptual_density = "medium"
    else:
        conceptual_density = "low"

    # --- Pacing ---
    if word_count > 110:
        pacing = "fast"
    elif word_count > 55:
        pacing = "moderate"
    else:
        pacing = "slow"

    # --- Segment type ---
    segment_type = _classify_segment_type(transcript, slide_text)

    # --- Novelty and energy ---
    novelty_level, presentation_energy = _compute_novelty_and_energy(transcript, slide_text)

    # --- Symbolic density ---
    symbol_hits = len(re.findall(
        r'[=\+\-×÷∇θαβσλ∂∑∏]|\b[A-Z]\b|\b[a-z]_[0-9]\b|\\[a-z]+',
        transcript
    ))
    symbolic_density = min(1.0, symbol_hits / max(word_count * 0.15, 1))

    # --- Example and transition detection ---
    has_examples = any(m in text for m in _EXAMPLE_MARKERS)
    has_transitions = any(m in text for m in _TRANSITION_MARKERS)

    difficulty_factors = []
    if jargon_count >= 3:
        difficulty_factors.append("high jargon density")
    if word_count > 100:
        difficulty_factors.append("high word count (fast delivery)")
    if conceptual_density == "high":
        difficulty_factors.append("multiple concepts in short span")
    if symbolic_density > 0.5:
        difficulty_factors.append("high symbolic/equation density")
    if not has_examples and difficulty == "high":
        difficulty_factors.append("no concrete examples to anchor understanding")

    # --- Assumed prerequisites ---
    assumed_prerequisites = _detect_prerequisites(transcript, text)

    # --- Concept extraction ---
    concept = _extract_concept(transcript, slide_text)

    return {
        "concept": concept,
        "summary": transcript[:100] + "..." if len(transcript) > 100 else transcript,
        "segment_type": segment_type,
        "is_new_concept": novelty_level in ("medium", "high"),
        "difficulty_level": difficulty,
        "conceptual_density": conceptual_density,
        "pacing": pacing,
        "difficulty_factors": difficulty_factors,
        "assumed_prerequisites": assumed_prerequisites,
        "why_this_may_be_hard": "; ".join(difficulty_factors) if difficulty_factors else "No major difficulty signals detected.",
        "exam_importance": "medium",
        "novelty_level": novelty_level,
        "presentation_energy": presentation_energy,
        "symbolic_density": round(symbolic_density, 3),
        "has_examples": has_examples,
        "has_transitions": has_transitions,
    }


# ---------------------------------------------------------------------------
# Segment type classification
# ---------------------------------------------------------------------------

def _classify_segment_type(transcript: str, slide_text: str) -> str:
    """
    Classify segment into one of:
    definition, example, derivation, recap, transition, intuition.
    Uses marker counting — highest score wins.
    """
    text = (transcript + " " + slide_text).lower()

    scores = {
        "definition":  sum(1 for m in _DEFINITION_MARKERS if m in text),
        "example":     sum(1 for m in _EXAMPLE_MARKERS if m in text),
        "derivation":  sum(1 for m in _DERIVATION_MARKERS if m in text),
        "recap":       sum(1 for m in _RECAP_MARKERS if m in text),
        "transition":  sum(1 for m in _TRANSITION_MARKERS if m in text),
        "intuition":   sum(1 for m in _INTUITION_MARKERS if m in text),
    }

    best = max(scores, key=scores.get)
    if scores[best] == 0:
        # No markers found — infer from content characteristics
        symbol_hits = len(re.findall(r'[=\+\-×÷∇θαβσλ∂∑∏]', transcript))
        if symbol_hits >= 4:
            return "derivation"
        return "definition"  # default: new material being introduced

    return best


# ---------------------------------------------------------------------------
# Prerequisite detection
# ---------------------------------------------------------------------------

def _detect_prerequisites(transcript: str, text_lower: str) -> list:
    """Detect assumed prior knowledge from transcript content."""
    prereqs = []

    # Explicit prerequisite references
    prereq_patterns = [
        r'you should (?:already )?know\s+(.+?)(?:\.|,|$)',
        r'assuming you(?:\'ve| have) (?:seen|learned|covered)\s+(.+?)(?:\.|,|$)',
        r'recall (?:that |from )?(.+?)(?:\.|,|$)',
        r'as (?:we|you) (?:saw|learned|covered) (?:in |with )?(.+?)(?:\.|,|$)',
    ]
    for pat in prereq_patterns:
        m = re.search(pat, transcript, re.IGNORECASE)
        if m:
            prereq = m.group(1).strip().rstrip('.,')
            if 2 < len(prereq) < 50:
                prereqs.append(prereq)

    # Implicit prerequisites: mentions of concepts assumed known
    implicit_map = {
        "derivative": "calculus (derivatives)",
        "integral": "calculus (integrals)",
        "matrix": "linear algebra",
        "vector": "linear algebra (vectors)",
        "probability": "probability theory",
        "bayes": "probability (Bayes' theorem)",
        "gradient": "multivariable calculus",
        "eigenvalue": "linear algebra (eigenvalues)",
    }
    for keyword, prereq in implicit_map.items():
        if keyword in text_lower and prereq not in prereqs:
            prereqs.append(prereq)
            if len(prereqs) >= 3:
                break

    return prereqs[:3]


# ---------------------------------------------------------------------------
# Content features for persona simulation
# ---------------------------------------------------------------------------

def _extract_content_features(transcript: str, slide_text: str, analysis: dict) -> dict:
    """
    Extract a structured content feature vector consumed by persona simulation.
    These features let personas respond to *what's actually in the content*,
    not just a difficulty number.
    """
    text = (transcript + " " + slide_text).lower()
    word_count = max(len(transcript.split()), 1)

    # Symbol density (0-1)
    symbol_hits = len(re.findall(
        r'[=\+\-×÷∇θαβσλ∂∑∏]|\b[A-Z]\b|\b[a-z]_[0-9]\b|\\[a-z]+',
        transcript
    ))
    symbolic_density = min(1.0, symbol_hits / (word_count * 0.15))

    # Example presence and strength (0-1)
    example_hits = sum(1 for m in _EXAMPLE_MARKERS if m in text)
    example_strength = min(1.0, example_hits / 3.0)

    # Transition smoothness (0-1): more transition markers = smoother
    transition_hits = sum(1 for m in _TRANSITION_MARKERS if m in text)
    transition_smoothness = min(1.0, transition_hits / 2.0)

    # Prerequisite load: how much prior knowledge is assumed (0-1)
    prereq_count = len(analysis.get("assumed_prerequisites", []))
    prereq_load = min(1.0, prereq_count / 3.0)

    # Pace pressure: words per expected time unit (normalized 0-1)
    pace_map = {"slow": 0.2, "moderate": 0.5, "fast": 0.85}
    pace_pressure = pace_map.get(analysis.get("pacing", "moderate"), 0.5)

    # Jargon density (0-1)
    jargon_markers = [
        "algorithm", "theorem", "derivative", "integral", "matrix", "gradient",
        "convolution", "eigenvalue", "polynomial", "stochastic", "neural",
        "backpropagation", "transformer", "embedding",
    ]
    jargon_count = sum(1 for t in jargon_markers if t in text)
    jargon_density = min(1.0, jargon_count / 5.0)

    return {
        "symbolic_density":      round(symbolic_density, 3),
        "example_strength":      round(example_strength, 3),
        "transition_smoothness": round(transition_smoothness, 3),
        "prerequisite_load":     round(prereq_load, 3),
        "pace_pressure":         round(pace_pressure, 3),
        "jargon_density":        round(jargon_density, 3),
        "segment_type":          analysis.get("segment_type", "definition"),
    }


# ---------------------------------------------------------------------------
# Concept extraction
# ---------------------------------------------------------------------------

def _extract_concept(transcript: str, slide_text: str) -> str:
    """
    Derive a clean concept label from transcript and slide text.
    Priority: slide title > named entity > definition pattern > known tech phrase > noun phrase.
    """
    # Priority 1: slide text first line if it looks like a title
    if slide_text:
        first_line = slide_text.strip().split('\n')[0].strip()
        clean_line = re.sub(r'[^\w\s\-]', '', first_line).strip()
        if 2 <= len(clean_line.split()) <= 7 and len(clean_line) < 55:
            return first_line

    # Priority 2: Named entity — theorem, formula, rule names
    named_patterns = [
        r"(\w[\w\s']{1,30}?)\s+(?:theorem|lemma|law|principle|rule|equation|formula|conjecture)",
        r"(?:theorem|lemma|law|principle|rule|equation|formula)\s+(?:of\s+)?(\w[\w\s']{1,25})",
    ]
    for pat in named_patterns:
        m = re.search(pat, transcript, re.IGNORECASE)
        if m:
            label = m.group(1).strip().rstrip('.,')
            if 1 <= len(label.split()) <= 5:
                return label.title()

    # Priority 3: definition pattern
    define_patterns = [
        r'([\w][\w\s]{3,35}?)\s+(?:is defined as|are defined as|is called|is known as)',
        r'(?:define|definition of|we call|we say)\s+([\w][\w\s]{2,30}?)(?:\s+as|\s+to|[.,]|$)',
    ]
    for pat in define_patterns:
        m = re.search(pat, transcript, re.IGNORECASE)
        if m:
            label = m.group(1).strip().rstrip('.,')
            if 1 <= len(label.split()) <= 5:
                return label.title()

    # Priority 4: known technical phrase (most specific first)
    transcript_lower = transcript.lower()
    for phrase in _TECH_PHRASES:
        if phrase in transcript_lower:
            return phrase.title()

    # Priority 5: strong noun phrase from transcript
    # Look for "the X of Y" or "X and Y" patterns with technical words
    np_patterns = [
        r'the\s+(\w+\s+(?:of|for|in)\s+\w[\w\s]{2,20}?)(?:\s+is|\s+are|[.,;])',
        r'(\w+\s+and\s+\w[\w\s]{2,15}?)(?:\s+is|\s+are|[.,;])',
    ]
    for pat in np_patterns:
        m = re.search(pat, transcript, re.IGNORECASE)
        if m:
            label = m.group(1).strip().rstrip('.,')
            words = label.split()
            if 2 <= len(words) <= 5 and any(w.lower() not in _STOPWORDS for w in words):
                return label.title()

    # Priority 6: first 4–5 meaningful words
    raw_words = [w.strip('.,!?:;()[]"\' ') for w in transcript.split()]
    meaningful = [w for w in raw_words if w.lower() not in _STOPWORDS and len(w) > 2]
    if meaningful:
        return ' '.join(meaningful[:5])

    return "This segment"


# ---------------------------------------------------------------------------
# Signal-based novelty and energy
# ---------------------------------------------------------------------------

def _compute_novelty_and_energy(transcript: str, slide_text: str) -> tuple:
    text = (transcript + " " + slide_text).lower()

    symbol_hits = len(re.findall(
        r'[=\+\-×÷∇θαβσλ∂∑∏]|\b[A-Z]\b|\b[a-z]_[0-9]\b|\\[a-z]+',
        transcript
    ))
    symbol_density = symbol_hits / max(len(transcript.split()), 1)

    def_hits = sum(1 for m in _DEFINITION_MARKERS if m in text)
    ex_hits = sum(1 for m in _EXAMPLE_MARKERS if m in text)

    novelty_score = (
        min(def_hits, 2) * 0.35
        + min(ex_hits, 2) * 0.30
        + min(symbol_density * 8.0, 1.0) * 0.35
    )
    if novelty_score >= 0.50:
        novelty_level = "high"
    elif novelty_score >= 0.20:
        novelty_level = "medium"
    else:
        novelty_level = "low"

    energy_markers = [
        "notice", "important", "key point", "remember", "crucial", "critical",
        "note that", "pay attention", "this is where", "now we", "now let",
        "therefore", "thus,", "this means", "in other words",
    ]
    energy_hits = sum(1 for m in energy_markers if m in text)
    excl_count = transcript.count('!')

    energy_score = min(energy_hits, 3) * 0.35 + min(excl_count, 2) * 0.15
    if energy_score >= 0.55:
        presentation_energy = "high"
    elif energy_score >= 0.20:
        presentation_energy = "medium"
    else:
        presentation_energy = "low"

    return novelty_level, presentation_energy
