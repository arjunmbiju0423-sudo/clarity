import TribeBadge from './TribeBadge'

export default function Header({ summary, tribeSource }) {
  return (
    <header className="header">
      <div className="header__left">
        <h1 className="header__title">Catapult</h1>
        <span className="header__subtitle">
          Lecture Analysis &nbsp;·&nbsp; {summary?.total_segments ?? 0} segments
        </span>
      </div>
      <div className="header__right">
        <TribeBadge source={tribeSource} />
      </div>
    </header>
  )
}
