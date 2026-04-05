import { truncateLabel, personaLabel, activeFlags } from '../utils/formatters'

export default function TopInsight({ segments, summary }) {
  if (!segments?.length || !summary) return null

  // Primary insight: most review-needed segment
  const primaryId = summary.most_review_needed_segment
  const seg = segments.find(s => s.segment_id === primaryId) || segments[0]
  const flags = activeFlags(seg.segment_role_flags)

  // Secondary callout: most engaging (recovery point)
  const engId = summary.most_engaging_segment
  const engSeg = segments.find(s => s.segment_id === engId)

  return (
    <div className="top-insight">
      <div className="top-insight__header">
        <span className="top-insight__eyebrow">Top Insight</span>
        {flags.map(f => (
          <span key={f.key} className="role-badge" style={{ '--badge-color': f.color }}>
            {f.label}
          </span>
        ))}
      </div>

      <div className="top-insight__body">
        <div className="top-insight__main">
          <p className="top-insight__concept">{seg.concept}</p>
          <p className="top-insight__explanation">{seg.ui_explanation}</p>
          {seg.root_cause && (
            <p className="top-insight__cause">{seg.root_cause}</p>
          )}
          <div className="top-insight__action">
            <span className="top-insight__action-label">Recommended:</span>
            <span>{seg.recommended_action}</span>
          </div>
          {seg.prerequisite_to_review && (
            <div className="top-insight__prereq">
              <span className="top-insight__action-label">Review first:</span>
              <span>{seg.prerequisite_to_review}</span>
            </div>
          )}
        </div>

        {engSeg && engSeg.segment_id !== seg.segment_id && (
          <div className="top-insight__recovery">
            <span className="top-insight__recovery-label">Recovery point</span>
            <p className="top-insight__recovery-concept">{truncateLabel(engSeg.concept, 40)}</p>
            <p className="top-insight__recovery-time">{engSeg.time_range}</p>
            <p className="top-insight__recovery-note">{engSeg.ui_explanation}</p>
          </div>
        )}
      </div>
    </div>
  )
}
