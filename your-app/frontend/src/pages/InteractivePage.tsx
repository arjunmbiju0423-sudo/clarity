import { useState, useEffect, useRef } from 'react'
import { Play, Pause, ChevronRight, ArrowLeft, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import NeuralResponseMap from '@/components/NeuralResponseMap'
import EngagementGraph from '@/components/EngagementGraph'
import {
  type PersonaKey,
  SEGMENTS, SEGMENT_METRICS,
  getNeuralAt, getSegmentAt, formatTime,
} from '@/data/lectureData'

const PERSONAS: { key: PersonaKey; label: string; desc: string }[] = [
  { key: 'novice',   label: 'Novice',   desc: 'Little prior knowledge · high confusion sensitivity' },
  { key: 'average',  label: 'Average',  desc: 'Some background · moderate pacing tolerance' },
  { key: 'advanced', label: 'Advanced', desc: 'Strong background · boredom risk during basics' },
]

interface Props {
  onBack: () => void
  onFullAnalysis: () => void
}

export default function InteractivePage({ onBack, onFullAnalysis }: Props) {
  const [persona, setPersona] = useState<PersonaKey>('novice')
  const [scrub, setScrub] = useState(0)
  const [playing, setPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  // Auto-play ticker
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setScrub(p => {
          if (p >= 100) { setPlaying(false); return 100 }
          return +(p + 0.4).toFixed(2)
        })
      }, 80)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [playing])

  const segIdx   = getSegmentAt(scrub)
  const segment  = SEGMENTS[Math.max(0, segIdx)]
  const neural   = getNeuralAt(scrub, persona)
  const metrics  = SEGMENT_METRICS[persona][Math.max(0, segIdx)]
  const currentPersonaMeta = PERSONAS.find(p => p.key === persona)!

  const engPct  = Math.round(metrics.engagement * 100)
  const confPct = Math.round(metrics.confusion   * 100)
  const attPct  = Math.round(metrics.attention   * 100)

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-white">
      {/* ── Header ── */}
      <header className="flex items-center justify-between border-b border-white/8 px-6 py-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400">
            Predicted analysis · mock data
          </span>
          <Button size="sm" variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20" onClick={onFullAnalysis}>
            Full Analysis <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* ── Persona switcher ── */}
      <div className="flex items-center gap-2 border-b border-white/8 px-6 py-3">
        <span className="mr-2 text-xs font-semibold uppercase tracking-widest text-gray-600">Learner</span>
        {PERSONAS.map(p => (
          <button
            key={p.key}
            onClick={() => setPersona(p.key)}
            title={p.desc}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
              persona === p.key
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-gray-400 hover:text-white hover:bg-white/8',
            )}
          >
            {p.label}
          </button>
        ))}
        <span className="ml-3 hidden text-xs text-gray-600 sm:block">{currentPersonaMeta.desc}</span>
      </div>

      {/* ── Main grid ── */}
      <div className="grid flex-1 grid-cols-1 gap-0 md:grid-cols-2">
        {/* LEFT: Mock video player */}
        <div className="flex flex-col border-r border-white/8">
          <MockVideoPlayer segment={segment} scrub={scrub} />

          {/* Live metrics strip */}
          <div className="flex border-t border-white/8">
            <MetricPill label="Engagement" value={engPct} color="#6366f1" />
            <MetricPill label="Confusion"  value={confPct} color="#f97316" border />
            <MetricPill label="Attention"  value={attPct}  color="#06b6d4" border />
          </div>
        </div>

        {/* RIGHT: Neural response */}
        <div className="flex flex-col items-center justify-center gap-4 p-6">
          <div className="flex w-full items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">
                Predicted Neural Response
              </p>
              <p className="mt-0.5 text-xs text-gray-700">{currentPersonaMeta.label} learning profile</p>
            </div>
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-700 cursor-help" />
              <div className="pointer-events-none absolute right-0 top-6 z-20 hidden w-64 rounded-xl border border-white/10 bg-gray-900 p-3 text-xs text-gray-400 shadow-xl group-hover:block">
                This is a simulated model of predicted neural activity based on content difficulty and learner profile — not a medical or exact brain measurement.
              </div>
            </div>
          </div>

          <NeuralResponseMap activation={neural} persona={persona} />

          <RegionLegend neural={neural} />
        </div>
      </div>

      {/* ── Engagement graph ── */}
      <div className="border-t border-white/8 px-6 py-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-600">
          Engagement Over Time &nbsp;·&nbsp;
          <span style={{ color: persona === 'novice' ? '#f97316' : persona === 'advanced' ? '#06b6d4' : '#6366f1' }}>
            {currentPersonaMeta.label}
          </span>
        </p>
        <EngagementGraph persona={persona} scrub={scrub} />
      </div>

      {/* ── Scrubber ── */}
      <div className="border-t border-white/8 px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Play/pause */}
          <button
            onClick={() => setPlaying(p => !p)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 pl-0.5" />}
          </button>

          {/* Time */}
          <span className="w-10 flex-shrink-0 text-right text-xs tabular-nums text-gray-500">
            {formatTime(scrub)}
          </span>

          {/* Range slider */}
          <input
            type="range"
            min={0} max={100} step={0.1}
            value={scrub}
            onChange={e => { setScrub(+e.target.value); setPlaying(false) }}
            className="scrubber flex-1"
          />

          <span className="w-10 text-xs tabular-nums text-gray-500">1:15</span>
        </div>

        {/* Segment markers below scrubber */}
        <div className="mt-2 flex pl-[72px] pr-[52px]">
          {SEGMENTS.map((seg, i) => (
            <button
              key={seg.id}
              style={{ width: `${100 / SEGMENTS.length}%` }}
              onClick={() => { setScrub(i * 20); setPlaying(false) }}
              className={cn(
                'truncate px-1 text-left text-[10px] transition-colors',
                segIdx === i ? 'font-semibold text-indigo-400' : 'text-gray-700 hover:text-gray-400',
              )}
            >
              {seg.concept}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Mock video player ──────────────────────────────────────────────────────

function MockVideoPlayer({ segment, scrub }: { segment: typeof SEGMENTS[0]; scrub: number }) {
  const progress = ((scrub % 20) / 20) * 100

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center bg-black min-h-[260px]">
      {/* Subtle grid bg */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-3 px-8 text-center">
        <div className="h-px w-12 bg-indigo-500/60" />
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">Now playing</p>
        <h2 className="text-xl font-bold leading-tight text-white">{segment.concept}</h2>
        <p className="text-sm text-gray-600">{segment.timeLabel}</p>
      </div>

      {/* Progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/8">
        <div
          className="h-full bg-indigo-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

// ── Metric pill ──────────────────────────────────────────────────────────

function MetricPill({ label, value, color, border }: { label: string; value: number; color: string; border?: boolean }) {
  return (
    <div className={cn('flex flex-1 flex-col items-center py-3 gap-0.5', border && 'border-l border-white/8')}>
      <span className="text-xs text-gray-600">{label}</span>
      <span className="text-base font-bold tabular-nums" style={{ color }}>{value}%</span>
      <div className="mt-1 h-1 w-full max-w-[60%] overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Region legend ──────────────────────────────────────────────────────────

function RegionLegend({ neural }: { neural: ReturnType<typeof getNeuralAt> }) {
  const items = [
    { label: 'Prefrontal',   value: neural.prefrontal },
    { label: 'Language Net', value: neural.language_network },
    { label: 'Default Mode', value: neural.default_mode },
    { label: 'Temporal-Par', value: neural.temporal_parietal },
    { label: 'Visual',       value: neural.visual_cortex },
    { label: 'Subcortical',  value: neural.subcortical },
  ]

  return (
    <div className="grid w-full grid-cols-3 gap-x-4 gap-y-1.5">
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-500" style={{ opacity: 0.3 + value * 0.7 }} />
          <span className="text-[10px] text-gray-600">{label}</span>
          <span className="ml-auto text-[10px] tabular-nums text-gray-500">{Math.round(value * 100)}%</span>
        </div>
      ))}
    </div>
  )
}
