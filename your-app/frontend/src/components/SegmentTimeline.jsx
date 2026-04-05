import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  classificationColor, activeFlags, truncateLabel,
  parseTimeStart, fmtScore, engagementColor, scoreColor,
} from '../utils/formatters'

export default function SegmentTimeline({ segments, selectedId, onSelect }) {
  if (!segments?.length) return null

  // Build chart data from segments
  const chartData = segments.map(s => ({
    name: truncateLabel(s.concept, 18),
    friction: +(s.friction_score * 100).toFixed(1),
    engagement: +(s.engagement_score * 100).toFixed(1),
    id: s.segment_id,
  }))

  return (
    <div className="segment-timeline">
      {/* ── Segment blocks ── */}
      <div className="segment-blocks">
        {segments.map((seg, i) => (
          <SegmentBlock
            key={seg.segment_id}
            segment={seg}
            index={i}
            total={segments.length}
            selected={seg.segment_id === selectedId}
            onClick={() => onSelect(seg.segment_id)}
          />
        ))}
      </div>

      {/* ── Recharts dual-line (supportive view) ── */}
      <div className="timeline-chart">
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis domain={[0, 100]} hide />
            <Tooltip
              formatter={(v, name) => [`${v}%`, name === 'friction' ? 'Friction' : 'Engagement']}
              contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
            />
            <ReferenceLine y={50} stroke="#e5e7eb" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="friction"
              stroke="#dc2626"
              strokeWidth={2}
              dot={{ r: 3, fill: '#dc2626' }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="engagement"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3, fill: '#2563eb' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="timeline-chart__legend">
          <span className="legend-item legend-item--friction">Friction</span>
          <span className="legend-item legend-item--engagement">Engagement</span>
        </div>
      </div>
    </div>
  )
}

function SegmentBlock({ segment, index, total, selected, onClick }) {
  const cc = classificationColor(segment.classification)
  const flags = activeFlags(segment.segment_role_flags)
  const frictionPct = Math.round(segment.friction_score * 100)
  const engagementPct = Math.round(segment.engagement_score * 100)

  return (
    <button
      className={`seg-block ${selected ? 'seg-block--selected' : ''}`}
      style={{
        '--block-bg': cc.bg,
        '--block-border': selected ? cc.border : 'transparent',
        '--block-border-top': cc.border,
        width: `${100 / total}%`,
      }}
      onClick={onClick}
      title={segment.concept}
    >
      {/* Role flag badges */}
      {flags.length > 0 && (
        <div className="seg-block__flags">
          {flags.map(f => (
            <span
              key={f.key}
              className="role-badge role-badge--small"
              style={{ '--badge-color': f.color }}
            >
              {f.short}
            </span>
          ))}
        </div>
      )}

      {/* Concept label */}
      <span className="seg-block__concept">
        {truncateLabel(segment.concept, 22)}
      </span>

      {/* Time range */}
      <span className="seg-block__time">{segment.time_range}</span>

      {/* Friction + engagement mini-bars */}
      <div className="seg-block__bars">
        <MiniBar value={frictionPct} color={scoreColor(segment.friction_score)} label="F" />
        <MiniBar value={engagementPct} color={engagementColor(segment.engagement_score)} label="E" />
      </div>

      {/* Classification label */}
      <span className="seg-block__class" style={{ color: cc.text }}>
        {cc.label}
      </span>
    </button>
  )
}

function MiniBar({ value, color, label }) {
  return (
    <div className="mini-bar">
      <span className="mini-bar__label">{label}</span>
      <div className="mini-bar__track">
        <div
          className="mini-bar__fill"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="mini-bar__value">{value}%</span>
    </div>
  )
}
