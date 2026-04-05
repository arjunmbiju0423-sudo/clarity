// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------

export function truncateLabel(text: string, maxChars = 30): string {
  if (!text || text.length <= maxChars) return text
  const truncated = text.slice(0, maxChars)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > maxChars * 0.6 ? truncated.slice(0, lastSpace) : truncated) + '…'
}

export function personaLabel(raw: string): string {
  const map: Record<string, string> = {
    weak_background_student: 'Novice',
    average_student: 'Intermediate',
    strong_student: 'Advanced',
  }
  return map[raw] || raw?.replace(/_/g, ' ') || '—'
}

// ---------------------------------------------------------------------------
// Classification colours
// ---------------------------------------------------------------------------

export const CLASSIFICATION_COLORS = {
  easy:      { bg: '#dcfce7', border: '#16a34a', text: '#15803d', label: 'Easy'      },
  dense:     { bg: '#fef9c3', border: '#ca8a04', text: '#92400e', label: 'Dense'     },
  confusing: { bg: '#fee2e2', border: '#dc2626', text: '#991b1b', label: 'Confusing' },
}

export function classificationColor(classification: string) {
  return CLASSIFICATION_COLORS[classification as keyof typeof CLASSIFICATION_COLORS] || CLASSIFICATION_COLORS.easy
}

// ---------------------------------------------------------------------------
// Role flag metadata
// ---------------------------------------------------------------------------

export const ROLE_FLAG_META: Record<string, { label: string; color: string; short: string }> = {
  most_engaging_candidate:      { label: 'Most Engaging',  color: '#2563eb', short: 'Engaging'  },
  least_engaging_candidate:     { label: 'Least Engaging', color: '#6b7280', short: 'Low Eng.'  },
  most_confusing_candidate:     { label: 'Most Confusing', color: '#dc2626', short: 'Confusing' },
  most_review_needed_candidate: { label: 'Review First',   color: '#d97706', short: 'Review'    },
}

export function activeFlags(segment_role_flags: Record<string, boolean> | null | undefined) {
  if (!segment_role_flags) return []
  return Object.entries(segment_role_flags)
    .filter(([, v]) => v)
    .map(([key]) => ({ key, ...ROLE_FLAG_META[key] }))
}

// ---------------------------------------------------------------------------
// Time parsing
// ---------------------------------------------------------------------------

export function parseTimeStart(timeRange: string): number {
  if (!timeRange) return 0
  const match = timeRange.match(/^([\d.]+)s/)
  return match ? parseFloat(match[1]) : 0
}

export function parseTimeEnd(timeRange: string): number {
  if (!timeRange) return 0
  const match = timeRange.match(/–([\d.]+)s/)
  return match ? parseFloat(match[1]) : 0
}

// ---------------------------------------------------------------------------
// Score formatting
// ---------------------------------------------------------------------------

export function fmtScore(score: number): string {
  return typeof score === 'number' ? (score * 100).toFixed(0) + '%' : String(score ?? '—')
}

export function scoreColor(score: number): string {
  if (score >= 0.6) return '#16a34a'
  if (score >= 0.35) return '#ca8a04'
  return '#dc2626'
}

export function engagementColor(score: number): string {
  if (score >= 0.5) return '#2563eb'
  if (score >= 0.35) return '#7c3aed'
  return '#6b7280'
}
