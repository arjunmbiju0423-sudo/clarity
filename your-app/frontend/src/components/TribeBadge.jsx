export default function TribeBadge({ source }) {
  const isReal = source === 'tribe_v2'
  return (
    <span className={`tribe-badge ${isReal ? 'tribe-badge--real' : 'tribe-badge--mock'}`}>
      <span className="tribe-badge__dot" />
      TRIBE: {isReal ? 'Real' : 'Mock'}
    </span>
  )
}
