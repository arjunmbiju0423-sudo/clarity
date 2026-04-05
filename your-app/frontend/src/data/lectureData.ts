// ---------------------------------------------------------------------------
// Mock lecture data for interactive analysis page
// ---------------------------------------------------------------------------

export type PersonaKey = 'novice' | 'average' | 'advanced'

export const TOTAL_DURATION = 75 // seconds (for mock scrubber)

export const SEGMENTS = [
  { id: 'seg_001', start: 0,  end: 15, concept: 'Introduction to Neural Networks', timeLabel: '0:00–0:15' },
  { id: 'seg_002', start: 15, end: 32, concept: 'Gradient Descent',                timeLabel: '0:15–0:32' },
  { id: 'seg_003', start: 32, end: 48, concept: 'Backpropagation & Chain Rule',    timeLabel: '0:32–0:48' },
  { id: 'seg_004', start: 48, end: 62, concept: 'Single Neuron Example',           timeLabel: '0:48–1:02' },
  { id: 'seg_005', start: 62, end: 75, concept: 'Vanishing Gradient Problem',      timeLabel: '1:02–1:15' },
]

// Per-persona metrics per segment (engagement 0-1, confusion 0-1, attention 0-1)
export const SEGMENT_METRICS: Record<PersonaKey, Array<{ engagement: number; confusion: number; attention: number }>> = {
  novice: [
    { engagement: 0.58, confusion: 0.32, attention: 0.75 },
    { engagement: 0.38, confusion: 0.72, attention: 0.48 },
    { engagement: 0.22, confusion: 0.91, attention: 0.28 },
    { engagement: 0.63, confusion: 0.38, attention: 0.68 },
    { engagement: 0.40, confusion: 0.66, attention: 0.44 },
  ],
  average: [
    { engagement: 0.65, confusion: 0.18, attention: 0.82 },
    { engagement: 0.55, confusion: 0.44, attention: 0.66 },
    { engagement: 0.44, confusion: 0.59, attention: 0.54 },
    { engagement: 0.72, confusion: 0.22, attention: 0.76 },
    { engagement: 0.56, confusion: 0.38, attention: 0.62 },
  ],
  advanced: [
    { engagement: 0.42, confusion: 0.05, attention: 0.52 }, // boredom during intro
    { engagement: 0.78, confusion: 0.09, attention: 0.84 },
    { engagement: 0.83, confusion: 0.14, attention: 0.88 },
    { engagement: 0.65, confusion: 0.07, attention: 0.72 },
    { engagement: 0.74, confusion: 0.11, attention: 0.80 },
  ],
}

// Approximate predicted neural region activations per segment per persona (0-1)
//
// Region mapping corrected per TRIBE v2 paper (d'Ascoli et al. 2026):
//   TRIBE outputs 20,484 fsaverage5 cortical vertices. The 6 groups below
//   are approximate functional groupings from HCP parcellation literature.
//   These are NOT exact brain measurements — labeled as "predicted" throughout.
//
//   language_network  — auditory cortex + inferior frontal (Broca/Wernicke)
//   prefrontal        — dorsolateral PFC, working memory proxy
//   visual_cortex     — early + ventral visual stream (V1–V4)
//   temporal_parietal — TPJ, multisensory comprehension hub
//   default_mode      — DMN proxy (elevated = mind-wandering)
//   subcortical       — amygdala + hippocampus (stress + memory encoding)
export interface NeuralActivation {
  language_network:  number
  prefrontal:        number
  visual_cortex:     number
  temporal_parietal: number
  default_mode:      number
  subcortical:       number
}

// Values grounded in TRIBE paper Fig 7B:
// Speech/text → language_network + prefrontal dominant
// Technical math → prefrontal elevated
// Low novelty → default_mode elevated (mind-wandering)
// High difficulty → subcortical elevated (stress response)
// Advanced learners: low default_mode (engaged), low subcortical (not stressed)
export const NEURAL_ACTIVATION: Record<PersonaKey, NeuralActivation[]> = {
  novice: [
    // seg_001: Intro — moderate load, moderate stress
    { language_network: 0.58, prefrontal: 0.52, visual_cortex: 0.30, temporal_parietal: 0.44, default_mode: 0.42, subcortical: 0.38 },
    // seg_002: Gradient Descent (equation) — high prefrontal + language load
    { language_network: 0.75, prefrontal: 0.82, visual_cortex: 0.35, temporal_parietal: 0.55, default_mode: 0.28, subcortical: 0.72 },
    // seg_003: Backprop (hardest) — peak prefrontal + subcortical stress
    { language_network: 0.68, prefrontal: 0.90, visual_cortex: 0.40, temporal_parietal: 0.62, default_mode: 0.22, subcortical: 0.88 },
    // seg_004: Single Neuron (recovery) — load drops, comprehension improves
    { language_network: 0.55, prefrontal: 0.48, visual_cortex: 0.52, temporal_parietal: 0.60, default_mode: 0.38, subcortical: 0.35 },
    // seg_005: Vanishing Gradient — moderate spike, renewed confusion
    { language_network: 0.65, prefrontal: 0.68, visual_cortex: 0.32, temporal_parietal: 0.52, default_mode: 0.32, subcortical: 0.62 },
  ],
  average: [
    { language_network: 0.52, prefrontal: 0.45, visual_cortex: 0.32, temporal_parietal: 0.50, default_mode: 0.35, subcortical: 0.22 },
    { language_network: 0.62, prefrontal: 0.68, visual_cortex: 0.36, temporal_parietal: 0.58, default_mode: 0.28, subcortical: 0.42 },
    { language_network: 0.58, prefrontal: 0.75, visual_cortex: 0.40, temporal_parietal: 0.65, default_mode: 0.24, subcortical: 0.55 },
    { language_network: 0.54, prefrontal: 0.50, visual_cortex: 0.55, temporal_parietal: 0.65, default_mode: 0.40, subcortical: 0.24 },
    { language_network: 0.60, prefrontal: 0.62, visual_cortex: 0.34, temporal_parietal: 0.58, default_mode: 0.30, subcortical: 0.36 },
  ],
  advanced: [
    // Advanced: low subcortical (not stressed), elevated default_mode early (boredom during intro)
    { language_network: 0.40, prefrontal: 0.35, visual_cortex: 0.30, temporal_parietal: 0.42, default_mode: 0.68, subcortical: 0.12 },
    { language_network: 0.58, prefrontal: 0.72, visual_cortex: 0.40, temporal_parietal: 0.76, default_mode: 0.30, subcortical: 0.14 },
    { language_network: 0.60, prefrontal: 0.85, visual_cortex: 0.44, temporal_parietal: 0.82, default_mode: 0.22, subcortical: 0.18 },
    { language_network: 0.55, prefrontal: 0.62, visual_cortex: 0.60, temporal_parietal: 0.68, default_mode: 0.42, subcortical: 0.13 },
    { language_network: 0.60, prefrontal: 0.78, visual_cortex: 0.38, temporal_parietal: 0.78, default_mode: 0.26, subcortical: 0.15 },
  ],
}

// Generate smooth engagement curve: 76 points (0..75 seconds)
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

export function buildEngagementCurve(persona: PersonaKey): Array<{ t: number; engagement: number; confusion: number }> {
  const metrics = SEGMENT_METRICS[persona]
  return Array.from({ length: 76 }, (_, t) => {
    const rawIdx = (t / TOTAL_DURATION) * (SEGMENTS.length - 1)
    const lo = Math.floor(rawIdx)
    const hi = Math.min(lo + 1, SEGMENTS.length - 1)
    const frac = rawIdx - lo
    const wave = Math.sin(t * 0.4) * 0.04
    return {
      t,
      engagement: Math.max(0.05, Math.min(0.98, lerp(metrics[lo].engagement, metrics[hi].engagement, frac) + wave)),
      confusion:  Math.max(0.02, Math.min(0.98, lerp(metrics[lo].confusion,  metrics[hi].confusion,  frac))),
    }
  })
}

// Lerp neural activation between segments based on scrub position (0-100)
export function getNeuralAt(scrub: number, persona: PersonaKey): NeuralActivation {
  const rawIdx = (scrub / 100) * (SEGMENTS.length - 1)
  const lo = Math.min(Math.floor(rawIdx), SEGMENTS.length - 2)
  const hi = lo + 1
  const frac = rawIdx - lo
  const a = NEURAL_ACTIVATION[persona][lo]
  const b = NEURAL_ACTIVATION[persona][hi]
  return {
    language_network:  lerp(a.language_network,  b.language_network,  frac),
    prefrontal:        lerp(a.prefrontal,        b.prefrontal,        frac),
    visual_cortex:     lerp(a.visual_cortex,     b.visual_cortex,     frac),
    temporal_parietal: lerp(a.temporal_parietal, b.temporal_parietal, frac),
    default_mode:      lerp(a.default_mode,      b.default_mode,      frac),
    subcortical:       lerp(a.subcortical,       b.subcortical,       frac),
  }
}

export function getSegmentAt(scrub: number) {
  const t = (scrub / 100) * TOTAL_DURATION
  return SEGMENTS.findIndex((s, i) =>
    t >= s.start && (i === SEGMENTS.length - 1 || t < SEGMENTS[i + 1].start)
  )
}

export function formatTime(scrub: number) {
  const secs = Math.round((scrub / 100) * TOTAL_DURATION)
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}
