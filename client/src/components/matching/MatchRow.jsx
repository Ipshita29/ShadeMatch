import ShadeSwatch from '../common/ShadeSwatch'
import styles from './MatchRow.module.css'

function MatchRow({ match, showClient = false }) {
  return (
    <li className={styles.row}>
      <ShadeSwatch hex={match.hex} size="md" label={`${match.shade} swatch`} />
      <div className={styles.body}>
        <p className={styles.product}>
          {match.brand} {match.product}
        </p>
        <p className={styles.shade}>
          {match.shade}
          {showClient && <span className={styles.client}> &middot; {match.clientName}</span>}
        </p>
      </div>
      <span className={styles.score}>{match.matchScore}% match</span>
    </li>
  )
}

export default MatchRow
