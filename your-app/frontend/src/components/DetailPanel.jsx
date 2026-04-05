import { personaLabel, activeFlags, classificationColor, fmtScore } from '../utils/formatters'

export default function DetailPanel({ segment }) {
  if (!segment) {
    return (
      <div className="detail-panel detail-panel--empty">
        <p>Select a segment to see details.</p>
      </div>
    )
  }

  const cc = classificationColor(segment.classification)
  const flags = activeFlags(segment.segment_role_flags)
  const persona = personaLabel(segment.most_affected_persona)
  const { content_factors, tribe_factors, persona_factors } = segment.supporting_factors || {}

  return (
    <div className="detail-panel">
      {/* ── Header ── */}
      <div className="detail-panel__header">
        <div className="detail-panel__badges">
          <span
            className="classification-badge"
            style={{ background: cc.bg, color: cc.text, borderColor: cc.border }}
          >
            {cc.label}
          </span>
          {flags.map(f => (
            <span key={f.key} className="role-badge" style={{ '--badge-color': f.color }}>
              {f.label}
            </span>
          ))}
        </div>
        <span className="detail-panel__time">{segment.time_range}</span>
      </div>

      {/* ── Concept ── */}
      <h2 className="detail-panel__concept">{segment.concept}</h2>

      {/* ── Scores ── */}
      <div className="detail-panel__scores">
        <ScorePill label="Friction"   value={segment.friction_score}   color="#dc2626" />
        <ScorePill label="Engagement" value={segment.engagement_score} color="#2563eb" />
        <ScorePill label="Confidence" value={segment.confidence}       isText />
      </div>

      {/* ── UI Explanation ── */}
      <p className="detail-panel__explanation">{segment.ui_explanation}</p>

      {/* ── Root cause ── */}
      <Section title="Why students struggle">
        <p className="detail-text">{segment.root_cause}</p>
      </Section>

      {/* ── Most affected persona ── */}
      <Section title="Most affected">
        <span className="persona-chip">{persona}</span>
      </Section>

      {/* ── Prereq ── */}
      {segment.prerequisite_to_review && (
        <Section title="Review first">
          <p className="detail-text detail-text--prereq">{segment.prerequisite_to_review}</p>
        </Section>
      )}

      {/* ── Recommended action ── */}
      <Section title="Recommended action">
        <p className="detail-text detail-text--action">{segment.recommended_action}</p>
      </Section>

      {/* ── Supporting factors ── */}
      {(content_factors?.length > 0 || tribe_factors?.length > 0 || persona_factors?.length > 0) && (
        <Section title="Supporting signals">
          <FactorList items={content_factors}  label="Content" />
          <FactorList items={tribe_factors}    label="TRIBE"   />
          <FactorList items={persona_factors}  label="Persona" />
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="detail-section">
      <span className="detail-section__title">{title}</span>
      {children}
    </div>
  )
}

function ScorePill({ label, value, color, isText }) {
  return (
    <div className="score-pill">
      <span className="score-pill__label">{label}</span>
      <span className="score-pill__value" style={isText ? {} : { color }}>
        {isText ? value : fmtScore(value)}
      </span>
    </div>
  )
}

function FactorList({ items, label }) {
  if (!items?.length) return null
  return (
    <div className="factor-list">
      <span className="factor-list__group">{label}</span>
      <ul>
        {items.map((f, i) => <li key={i}>{f}</li>)}
      </ul>
    </div>
  )
}
