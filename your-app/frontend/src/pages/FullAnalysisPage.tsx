import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { MOCK_RESPONSE } from '@/data/mockResponse'
import { SEGMENT_METRICS, type PersonaKey } from '@/data/lectureData'
import SectionWithMockup from '@/components/ui/section-with-mockup'
import ShaderBackground from '@/components/ui/shader-background'

const TEAL = '#2dd4bf'
const TEAL_DIM = '#0f766e'

const SEGMENT_CONTEXT: Record<string, { short: string; action: string }> = {
  seg_001: {
    short: 'No concrete hook — default-mode network active, students mentally elsewhere.',
    action: 'Open with a question or analogy before introducing the concept.',
  },
  seg_002: {
    short: 'Notation overload — θ = θ − α∇L(θ) packs too much without unpacking.',
    action: 'Pause and narrate each symbol before moving to the full equation.',
  },
  seg_003: {
    short: 'Chain rule used as a tool, not understood — every backward-pass step looks arbitrary.',
    action: 'Add a worked numeric example: show ∂L/∂w step by step before generalizing.',
  },
  seg_004: {
    short: 'Concrete neuron example — load drops, novices can finally build a mental model.',
    action: 'Extend this anchor: ask students to predict the output before showing it.',
  },
  seg_005: {
    short: 'Vanishing gradients sound like a bug, not a logical consequence of chain multiplication.',
    action: 'Callback: "Remember multiplying small numbers? Here\'s what happens across 10 layers."',
  },
}

const PERSONAS: PersonaKey[] = ['novice', 'average', 'advanced']
const PERSONA_LABELS: Record<PersonaKey, string> = { novice: 'Novice', average: 'Average', advanced: 'Advanced' }

interface Props { onBack: () => void }

function FrictionBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-gray-500 uppercase tracking-widest">Friction</span>
        <span className="text-sm font-black tabular-nums" style={{ color }}>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/8 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function EngagementBar({ value }: { value: number }) {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-gray-500 uppercase tracking-widest">Engagement</span>
        <span className="text-sm font-black tabular-nums" style={{ color: TEAL }}>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/8 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: TEAL }}
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
    </div>
  )
}

function PersonaChart({ segmentIndex }: { segmentIndex: number }) {
  const data = PERSONAS.map(p => ({
    name: PERSONA_LABELS[p],
    Engagement: Math.round(SEGMENT_METRICS[p][segmentIndex].engagement * 100),
    Confusion: Math.round(SEGMENT_METRICS[p][segmentIndex].confusion * 100),
  }))
  return (
    <div className="p-6">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Persona Breakdown</p>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={data} barGap={3} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
          <Tooltip
            contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            labelStyle={{ color: '#fff', fontSize: 11 }}
            itemStyle={{ fontSize: 11 }}
          />
          <Bar dataKey="Engagement" radius={[4, 4, 0, 0]} maxBarSize={18}>
            {data.map((_, i) => <Cell key={i} fill={TEAL} />)}
          </Bar>
          <Bar dataKey="Confusion" radius={[4, 4, 0, 0]} maxBarSize={18}>
            {data.map((_, i) => <Cell key={i} fill="#f97316" />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex gap-4">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="h-2 w-2 rounded-full" style={{ background: TEAL }} /> Engagement
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="h-2 w-2 rounded-full bg-orange-500" /> Confusion
        </span>
      </div>
    </div>
  )
}

// ── Slide 0: Overview ──────────────────────────────────────────────────────────
function SlideOverview() {
  const { lecture_summary, segments } = MOCK_RESPONSE
  const frictionColor = lecture_summary.average_friction > 0.5 ? '#ef4444' : lecture_summary.average_friction > 0.35 ? '#f97316' : TEAL

  const overviewMockup = (
    <div className="p-8 space-y-8">
      {/* Big numbers */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/8 bg-white/4 p-6 text-center">
          <div className="text-5xl font-black tabular-nums" style={{ color: frictionColor }}>
            {Math.round(lecture_summary.average_friction * 100)}%
          </div>
          <p className="mt-2 text-xs uppercase tracking-widest text-gray-500">Avg Friction</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/4 p-6 text-center">
          <div className="text-5xl font-black tabular-nums" style={{ color: TEAL }}>
            {Math.round(lecture_summary.average_engagement * 100)}%
          </div>
          <p className="mt-2 text-xs uppercase tracking-widest text-gray-500">Avg Engagement</p>
        </div>
      </div>
      {/* Mini segment bars */}
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Friction per Segment</p>
        <div className="space-y-2">
          {segments.map((seg, i) => {
            const c = seg.friction_score > 0.5 ? '#ef4444' : seg.friction_score > 0.35 ? '#f97316' : TEAL
            return (
              <div key={seg.segment_id} className="flex items-center gap-3">
                <span className="w-5 text-[10px] text-gray-600 text-right">S{i + 1}</span>
                <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${seg.friction_score * 100}%`, background: c }} />
                </div>
                <span className="w-8 text-[10px] tabular-nums text-right" style={{ color: c }}>
                  {Math.round(seg.friction_score * 100)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  return (
    <SectionWithMockup
      title={
        <span>
          Your lecture,{' '}
          <span style={{ color: TEAL }}>decoded.</span>
        </span>
      }
      description={
        <div className="space-y-4">
          <p>Here's what the AI found across <strong className="text-white">{lecture_summary.total_segments} segments</strong> of your lecture. The data highlights where students mentally checked out and where they were locked in.</p>
          <div className="space-y-2 mt-4">
            <div className="flex items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: TEAL }} />
              <span>Average friction: <strong style={{ color: frictionColor }}>{Math.round(lecture_summary.average_friction * 100)}%</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: TEAL }} />
              <span>Average engagement: <strong style={{ color: TEAL }}>{Math.round(lecture_summary.average_engagement * 100)}%</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: TEAL }} />
              <span>Hardest moment: <strong className="text-white">{MOCK_RESPONSE.segments.find(s => s.segment_id === lecture_summary.most_confusing_segment)?.concept}</strong></span>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-4">Use the arrow to walk through each insight →</p>
        </div>
      }
      mockupContent={overviewMockup}
    />
  )
}

// ── Slide 1: Hardest Moment ────────────────────────────────────────────────────
function SlideHardestMoment() {
  const { segments, lecture_summary } = MOCK_RESPONSE
  const seg = segments.find(s => s.segment_id === lecture_summary.most_confusing_segment)!
  const ctx = SEGMENT_CONTEXT[seg.segment_id]
  const mockup = (
    <div className="p-8 space-y-6">
      <div className="text-center pb-6 border-b border-white/8">
        <p className="text-[10px] uppercase tracking-widest text-red-400 mb-2">Peak confusion at</p>
        <div className="text-4xl font-black text-red-400 tabular-nums">{seg.time_range}</div>
        <p className="mt-2 text-sm font-semibold text-gray-200">{seg.concept}</p>
      </div>
      <FrictionBar value={seg.friction_score} color="#ef4444" />
      <EngagementBar value={seg.engagement_score} />
      <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-4">
        <p className="text-[9px] uppercase tracking-widest text-red-400 mb-1">Why students struggle</p>
        <p className="text-sm text-gray-300 leading-relaxed">{ctx.short}</p>
      </div>
    </div>
  )

  return (
    <SectionWithMockup
      reverseLayout
      accentColor="#ef4444"
      title={
        <span>
          <span className="text-red-400">62%</span> of students lost here.
        </span>
      }
      description={
        <div className="space-y-5">
          <p>The biggest drop-off happens at <strong className="text-white">{seg.time_range}</strong> — when <strong className="text-white">{seg.concept}</strong> is introduced.</p>
          <p style={{ color: '#94a3b8' }}>{ctx.short}</p>
          <div className="rounded-xl border p-4 mt-4" style={{ borderColor: `${TEAL}30`, background: `${TEAL}10` }}>
            <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: TEAL }}>Fix this</p>
            <p className="text-sm leading-relaxed" style={{ color: `${TEAL}ee` }}>{ctx.action}</p>
          </div>
        </div>
      }
      mockupContent={mockup}
    />
  )
}

// ── Slide 2–6: Per Segment ─────────────────────────────────────────────────────
function SlideSegment({ index }: { index: number }) {
  const seg = MOCK_RESPONSE.segments[index]
  const ctx = SEGMENT_CONTEXT[seg.segment_id]
  const frictionColor = seg.friction_score > 0.5 ? '#ef4444' : seg.friction_score > 0.35 ? '#f97316' : TEAL
  const isGood = seg.friction_score < 0.3

  const mockup = (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between pb-5 border-b border-white/8">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Segment {index + 1}</p>
          <p className="text-sm font-semibold text-gray-100 max-w-[220px] leading-tight">{seg.concept}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black tabular-nums" style={{ color: frictionColor }}>
            {Math.round(seg.friction_score * 100)}%
          </div>
          <p className="text-[9px] text-gray-600">friction</p>
        </div>
      </div>
      <FrictionBar value={seg.friction_score} color={frictionColor} />
      <EngagementBar value={seg.engagement_score} />
      <PersonaChart segmentIndex={index} />
    </div>
  )

  return (
    <SectionWithMockup
      reverseLayout={index % 2 === 1}
      accentColor={isGood ? TEAL : frictionColor}
      title={
        <span>
          {seg.time_range} —{' '}
          <span style={{ color: isGood ? TEAL : frictionColor }}>
            {isGood ? 'Strong moment.' : 'Students struggle.'}
          </span>
        </span>
      }
      description={
        <div className="space-y-5">
          <p className="text-lg font-semibold text-gray-200">{seg.concept}</p>
          <p style={{ color: '#94a3b8' }}>{ctx.short}</p>
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: `${TEAL}30`, background: `${TEAL}10` }}
          >
            <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: TEAL }}>Recommended Action</p>
            <p className="text-sm leading-relaxed" style={{ color: `${TEAL}ee` }}>{ctx.action}</p>
          </div>
          {seg.supporting_factors.tribe_factors.length > 0 && (
            <div className="space-y-1.5">
              {seg.supporting_factors.tribe_factors.map(f => (
                <p key={f} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: TEAL_DIM }} />
                  {f}
                </p>
              ))}
            </div>
          )}
        </div>
      }
      mockupContent={mockup}
    />
  )
}

// ── Slide last: Top 3 Actions ──────────────────────────────────────────────────
function SlideActions() {
  const { segments } = MOCK_RESPONSE
  const sorted = [...segments].sort((a, b) => b.friction_score - a.friction_score).slice(0, 3)

  const mockup = (
    <div className="p-8 space-y-4">
      {sorted.map((seg, i) => {
        const ctx = SEGMENT_CONTEXT[seg.segment_id]
        return (
          <div key={seg.segment_id} className="rounded-2xl border border-white/8 bg-white/4 p-5">
            <div className="flex items-start gap-4">
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-black"
                style={{ background: TEAL, color: '#000' }}
              >
                {i + 1}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-xs font-bold text-gray-200">{seg.concept}</p>
                <p className="text-xs text-gray-500">{seg.time_range} · <span style={{ color: '#ef4444' }}>{Math.round(seg.friction_score * 100)}% friction</span></p>
                <p className="text-xs leading-relaxed" style={{ color: TEAL }}>{ctx.action}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <SectionWithMockup
      accentColor={TEAL}
      title={
        <span>
          <span style={{ color: TEAL }}>3 things</span> to fix before next class.
        </span>
      }
      description={
        <div className="space-y-4">
          <p>These are the highest-impact changes you can make. Each one directly addresses a moment where students disengaged or got confused.</p>
          <p style={{ color: '#94a3b8' }}>Start with #1 — it accounts for the most confusion in the lecture and affects all learner types.</p>
          <div className="mt-6 p-4 rounded-xl border" style={{ borderColor: `${TEAL}30`, background: `${TEAL}08` }}>
            <p className="text-xs" style={{ color: TEAL }}>Implementing all 3 recommendations typically reduces confusion scores by 40–60% in follow-up sessions.</p>
          </div>
        </div>
      }
      mockupContent={mockup}
    />
  )
}

// ── Slide registry ─────────────────────────────────────────────────────────────
const TOTAL_SLIDES = 2 + MOCK_RESPONSE.segments.length + 1 // overview + hardest + segments + actions

function renderSlide(index: number) {
  if (index === 0) return <SlideOverview />
  if (index === 1) return <SlideHardestMoment />
  if (index >= 2 && index < 2 + MOCK_RESPONSE.segments.length) return <SlideSegment index={index - 2} />
  return <SlideActions />
}

const SLIDE_LABELS = [
  'Overview',
  'Hardest Moment',
  ...MOCK_RESPONSE.segments.map((_, i) => `Segment ${i + 1}`),
  'Top Actions',
]

export default function FullAnalysisPage({ onBack }: Props) {
  const [slide, setSlide] = useState(0)
  const [direction, setDirection] = useState(1)

  const goTo = (next: number) => {
    if (next < 0 || next >= TOTAL_SLIDES) return
    setDirection(next > slide ? 1 : -1)
    setSlide(next)
  }

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 80 : -80 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -80 : 80 }),
  }

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      <ShaderBackground />

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/8 bg-black/60 px-6 py-3 backdrop-blur-md">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <span className="text-sm font-semibold text-white tracking-wide">
          {SLIDE_LABELS[slide]}
        </span>
        <span className="text-xs text-gray-500">{slide + 1} / {TOTAL_SLIDES}</span>
      </header>

      {/* ── Slide content ── */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-12 py-12 min-h-[calc(100vh-56px)] flex flex-col justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            className="w-full"
          >
            {renderSlide(slide)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Navigation arrows ── */}
      <div className="fixed bottom-10 left-0 right-0 z-30 flex items-center justify-center gap-6 px-6">
        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === slide ? 24 : 6,
                height: 6,
                background: i === slide ? TEAL : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Left arrow */}
      {slide > 0 && (
        <button
          onClick={() => goTo(slide - 1)}
          className="fixed left-6 top-1/2 z-30 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </button>
      )}

      {/* Right arrow */}
      {slide < TOTAL_SLIDES - 1 && (
        <button
          onClick={() => goTo(slide + 1)}
          className="fixed right-6 top-1/2 z-30 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/60 backdrop-blur-sm hover:bg-white/10 transition-all"
          style={{ boxShadow: `0 0 24px ${TEAL}40` }}
        >
          <ArrowRight className="h-5 w-5" style={{ color: TEAL }} />
        </button>
      )}
    </div>
  )
}
