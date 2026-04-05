import { useState } from 'react'
import { ArrowLeft, Cpu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MOCK_RESPONSE } from '@/data/mockResponse'
import { activeFlags, classificationColor, personaLabel, truncateLabel, fmtScore, ROLE_FLAG_META } from '@/utils/formatters'

// ── Types ──────────────────────────────────────────────────────────────────

interface Segment {
  segment_id: string
  time_range: string
  concept: string
  classification: 'easy' | 'dense' | 'confusing'
  engagement_label: string
  friction_score: number
  engagement_score: number
  confidence: string
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
}

interface ResultsData {
  segments: Segment[]
  lecture_summary: typeof MOCK_RESPONSE['lecture_summary']
  tribe_source: string
}

interface ResultsPageProps {
  data: ResultsData
  onBack: () => void
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ResultsPage({ data, onBack }: ResultsPageProps) {
  const { segments, lecture_summary, tribe_source } = data
  const defaultId = lecture_summary.most_review_needed_segment
  const [selectedId, setSelectedId] = useState(defaultId || segments[0]?.segment_id)
  const activeSegment = segments.find(s => s.segment_id === selectedId) ?? segments[0]

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="h-4 w-px bg-gray-200" />
          <h1 className="font-semibold text-gray-900">Here's what we found in your lecture</h1>
        </div>
        <Badge variant={tribe_source === 'tribe_v2' ? 'real' : 'mock'}>
          <Cpu className="h-3 w-3" />
          TRIBE: {tribe_source === 'tribe_v2' ? 'Real' : 'Mock'}
        </Badge>
      </header>

      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* ── Left column ── */}
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          {/* Top Insight */}
          <TopInsightCard segments={segments} summary={lecture_summary} onSelect={setSelectedId} />

          {/* Segment Timeline */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Segment Timeline
            </p>
            <SegmentTimeline
              segments={segments}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </div>

        {/* ── Right panel ── */}
        <aside className="w-[360px] flex-shrink-0 overflow-y-auto border-l border-gray-100 bg-white p-6">
          <DetailPanel segment={activeSegment} />
        </aside>
      </div>
    </div>
  )
}

// ── Top Insight Card ───────────────────────────────────────────────────────

function TopInsightCard({
  segments,
  summary,
  onSelect,
}: {
  segments: Segment[]
  summary: ResultsData['lecture_summary']
  onSelect: (id: string) => void
}) {
  const primary = segments.find(s => s.segment_id === summary.most_review_needed_segment) ?? segments[0]
  const recovery = segments.find(s => s.segment_id === summary.most_engaging_segment)
  const flags = activeFlags(primary.segment_role_flags)

  return (
    <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-orange-500">
            Start here
          </p>
          <h2 className="text-xl font-bold text-gray-900">{primary.concept}</h2>
        </div>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {flags.map(f => (
            <FlagBadge key={f.key} flagKey={f.key} label={f.label} />
          ))}
        </div>
      </div>

      {/* Recommended action — FIRST */}
      <div className="mb-4 rounded-xl bg-white/70 p-4 backdrop-blur-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-600">
          Recommended action
        </p>
        <p className="text-sm font-medium text-gray-900">{primary.recommended_action}</p>
      </div>

      <p className="mb-3 text-sm leading-relaxed text-gray-700">{primary.ui_explanation}</p>

      {primary.prerequisite_to_review && (
        <p className="mb-4 text-sm text-violet-700">
          <span className="font-semibold">Review first: </span>
          {primary.prerequisite_to_review}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" onClick={() => onSelect(primary.segment_id)}>
          View segment details
        </Button>
        {recovery && recovery.segment_id !== primary.segment_id && (
          <button
            onClick={() => onSelect(recovery.segment_id)}
            className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-xs font-medium text-green-700 transition hover:bg-green-100"
          >
            <span className="h-2 w-2 rounded-full bg-green-400" />
            Recovery point: {truncateLabel(recovery.concept, 25)} · {recovery.time_range}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Segment Timeline ───────────────────────────────────────────────────────

function SegmentTimeline({
  segments,
  selectedId,
  onSelect,
}: {
  segments: Segment[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex min-w-0">
        {segments.map((seg) => (
          <SegmentBlock
            key={seg.segment_id}
            segment={seg}
            total={segments.length}
            selected={seg.segment_id === selectedId}
            onClick={() => onSelect(seg.segment_id)}
          />
        ))}
      </div>

      {/* Legend row */}
      <div className="flex items-center justify-end gap-4 border-t border-gray-50 px-4 py-2">
        <LegendItem color="bg-red-400" label="Friction" />
        <LegendItem color="bg-blue-400" label="Engagement" />
        <LegendItem color="bg-red-100 border border-red-200" label="Confusing" />
        <LegendItem color="bg-amber-100 border border-amber-200" label="Dense" />
        <LegendItem color="bg-green-100 border border-green-200" label="Easy" />
      </div>
    </div>
  )
}

function SegmentBlock({
  segment,
  total,
  selected,
  onClick,
}: {
  segment: Segment
  total: number
  selected: boolean
  onClick: () => void
}) {
  const cc = classificationColor(segment.classification)
  const flags = activeFlags(segment.segment_role_flags)
  const frictionPct = Math.round(segment.friction_score * 100)
  const engPct = Math.round(segment.engagement_score * 100)

  return (
    <button
      onClick={onClick}
      style={{ width: `${100 / total}%` }}
      className={cn(
        'flex min-w-0 flex-col gap-2 border-r border-gray-100 p-3 text-left transition-all',
        'last:border-r-0',
        selected ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-400' : 'hover:bg-gray-50',
      )}
    >
      {/* Top colour bar */}
      <div className="h-1 w-full rounded-full" style={{ background: cc.border }} />

      {/* Role flags */}
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {flags.map(f => (
            <FlagBadge key={f.key} flagKey={f.key} label={f.short} small />
          ))}
        </div>
      )}

      {/* Concept */}
      <span className="text-xs font-semibold leading-tight text-gray-900 break-words hyphens-auto">
        {truncateLabel(segment.concept, 30)}
      </span>

      {/* Time */}
      <span className="text-[10px] text-gray-400">{segment.time_range}</span>

      {/* Mini score bars */}
      <div className="space-y-1">
        <MiniBar value={frictionPct} color={cc.border} label="F" />
        <MiniBar value={engPct} color="#60a5fa" label="E" />
      </div>

      {/* Classification */}
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: cc.text }}>
        {cc.label}
      </span>
    </button>
  )
}

function MiniBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2 text-[9px] font-semibold text-gray-400">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-gray-100" style={{ height: 4 }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="w-6 text-right text-[9px] text-gray-400">{value}%</span>
    </div>
  )
}

// ── Detail Panel ───────────────────────────────────────────────────────────

function DetailPanel({ segment }: { segment: Segment | undefined }) {
  if (!segment) return (
    <p className="text-center text-sm text-gray-400 mt-20">Select a segment to see details.</p>
  )

  const cc = classificationColor(segment.classification)
  const flags = activeFlags(segment.segment_role_flags)
  const { content_factors, tribe_factors, persona_factors } = segment.supporting_factors

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: cc.bg, color: cc.text, borderColor: cc.border }}
        >
          {cc.label}
        </span>
        {flags.map(f => <FlagBadge key={f.key} flagKey={f.key} label={f.label} />)}
        <span className="ml-auto text-xs text-gray-400">{segment.time_range}</span>
      </div>

      {/* Concept */}
      <h3 className="text-lg font-bold leading-snug text-gray-900">{segment.concept}</h3>

      {/* Scores */}
      <div className="flex gap-3">
        <ScorePill label="Friction"   value={fmtScore(segment.friction_score)}   color="#ef4444" />
        <ScorePill label="Engagement" value={fmtScore(segment.engagement_score)} color="#3b82f6" />
        <ScorePill label="Confidence" value={segment.confidence} />
      </div>

      <hr className="border-gray-100" />

      {/* Recommended action — FIRST */}
      <DetailRow
        label="What to do next"
        className="rounded-xl bg-amber-50 p-3 -mx-1"
        labelColor="text-amber-600"
      >
        <p className="text-sm font-medium text-gray-900">{segment.recommended_action}</p>
      </DetailRow>

      {/* What happened */}
      <DetailRow label="What happened">
        <p className="text-sm leading-relaxed text-gray-700">{segment.ui_explanation}</p>
      </DetailRow>

      {/* Why */}
      <DetailRow label="Why students struggle here">
        <p className="text-sm leading-relaxed text-gray-600">{segment.root_cause}</p>
      </DetailRow>

      {/* Most affected */}
      <DetailRow label="Most affected">
        <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-700 border border-violet-100">
          {personaLabel(segment.most_affected_persona)}
        </span>
      </DetailRow>

      {/* Prereq */}
      {segment.prerequisite_to_review && (
        <DetailRow label="Review first">
          <p className="text-sm font-medium text-violet-700">{segment.prerequisite_to_review}</p>
        </DetailRow>
      )}

      {/* Supporting signals */}
      {(content_factors?.length > 0 || tribe_factors?.length > 0 || persona_factors?.length > 0) && (
        <DetailRow label="Supporting signals">
          <FactorGroup label="Content" items={content_factors} />
          <FactorGroup label="TRIBE"   items={tribe_factors} />
          <FactorGroup label="Persona" items={persona_factors} />
        </DetailRow>
      )}
    </div>
  )
}

// ── Small helpers ──────────────────────────────────────────────────────────

const FLAG_STYLES: Record<string, string> = {
  most_engaging_candidate:      'bg-blue-50 text-blue-700 border-blue-200',
  least_engaging_candidate:     'bg-gray-100 text-gray-600 border-gray-200',
  most_confusing_candidate:     'bg-red-50 text-red-700 border-red-200',
  most_review_needed_candidate: 'bg-orange-50 text-orange-700 border-orange-200',
}

function FlagBadge({ flagKey, label, small }: { flagKey: string; label: string; small?: boolean }) {
  return (
    <span className={cn(
      'rounded-full border font-semibold uppercase tracking-wide',
      small ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-0.5 text-[10px]',
      FLAG_STYLES[flagKey] ?? 'bg-gray-100 text-gray-600 border-gray-200',
    )}>
      {label}
    </span>
  )
}

function ScorePill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 rounded-xl border border-gray-100 bg-gray-50 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-base font-bold" style={{ color: color ?? '#374151' }}>{value}</span>
    </div>
  )
}

function DetailRow({
  label,
  children,
  className,
  labelColor,
}: {
  label: string
  children: React.ReactNode
  className?: string
  labelColor?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className={cn('text-[10px] font-bold uppercase tracking-widest', labelColor ?? 'text-gray-400')}>
        {label}
      </span>
      {children}
    </div>
  )
}

function FactorGroup({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null
  return (
    <div className="mb-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <ul className="mt-1 space-y-1">
        {items.map((f, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
            <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-gray-300" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
      <span className={cn('h-2 w-2 rounded-sm', color)} />
      {label}
    </div>
  )
}
