import ShadeSwatch from '../common/ShadeSwatch'
import Badge from '../common/Badge'
import Button from '../common/Button'
import styles from './MatchCard.module.css'

export function TopMatchCard({ match, onCompare }) {
  return (
    <div className={styles.top}>
      <div className={styles.topLeft}>
        <ShadeSwatch hex={match.hex} size="xl" label={`${match.shade} swatch`} />
      </div>

      <div className={styles.topBody}>
        <p className={styles.topLabel}>Top Match</p>
        <h3 className={styles.topShade}>{match.shade}</h3>

        <div className={styles.scoreRow}>
          <span className={styles.score}>{match.matchScore}%</span>
          <span className={styles.scoreLabel}>Match score</span>
        </div>

        <p className={styles.meta}>
          {match.undertone} &bull; {match.depth}
        </p>

        <ul className={styles.checks}>
          {match.checks.map((check) => (
            <li key={check}>
              <CheckIcon />
              {check}
            </li>
          ))}
        </ul>

        <Button variant="secondary" onClick={onCompare}>
          Compare Shades
        </Button>
      </div>
    </div>
  )
}

export function SecondaryMatchCard({ match }) {
  return (
    <div className={styles.secondary}>
      <ShadeSwatch hex={match.hex} size="lg" label={`${match.shade} swatch`} />
      <div className={styles.secondaryBody}>
        <p className={styles.secondaryRank}>#{match.rank} {match.shade}</p>
        <p className={styles.secondaryMeta}>
          {match.undertone} &bull; {match.depth}
        </p>
      </div>
      <Badge tone="outline">{match.matchScore}% Match score</Badge>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="var(--sage-muted)" strokeWidth="1.4" />
      <path
        d="M6 10.2l2.4 2.4L14 7.4"
        stroke="var(--sage-muted)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
