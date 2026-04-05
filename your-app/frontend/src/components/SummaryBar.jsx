import { fmtScore, ROLE_FLAG_META } from '../utils/formatters'

const STAT_FLAGS = [
  { key: 'most_confusing_segment',    timeKey: 'most_confusing_time',    flagKey: 'most_confusing_candidate'      },
  { key: 'most_engaging_segment',     timeKey: 'most_engaging_time',      flagKey: 'most_engaging_candidate'       },
  { key: 'least_engaging_segment',    timeKey: 'least_engaging_time',     flagKey: 'least_engaging_candidate'      },
  { key: 'most_review_needed_segment', timeKey: 'most_review_needed_time', flagKey: 'most_review_needed_candidate' },
]

export default function SummaryBar({ summary, segments, onSelect }) {
  if (!summary) return null

  const segById = Object.fromEntries((segments || []).map(s => [s.segment_id, s]))

  return (
    <div className="summary-bar">
      <div className="summary-bar__stats">
        <Stat label="Avg Friction"    value={fmtScore(summary.average_friction)}    accent="#dc2626" />
        <Stat label="Avg Engagement"  value={fmtScore(summary.average_engagement)}  accent="#2563eb" />
        <Stat label="Segments"        value={summary.total_segments}                accent="#6b7280" />
      </div>

      <div className="summary-bar__flags">
        {STAT_FLAGS.map(({ key, timeKey, flagKey }) => {
          const segId   = summary[key]
          const time    = summary[timeKey]
          const meta    = ROLE_FLAG_META[flagKey]
          const seg     = segById[segId]
          if (!segId || !meta) return null
          return (
            <button
              key={key}
              className="summary-flag"
              onClick={() => seg && onSelect(segId)}
            >
              <span className="summary-flag__label" style={{ color: meta.color }}>{meta.label}</span>
              <span className="summary-flag__id">{time}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div className="summary-stat">
      <span className="summary-stat__value" style={{ color: accent }}>{value}</span>
      <span className="summary-stat__label">{label}</span>
    </div>
  )
}
