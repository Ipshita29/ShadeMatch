import ShadeSwatch from '../components/common/ShadeSwatch'
import { mockMatches } from '../utils/mockData'
import styles from './Matches.module.css'

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function Matches() {
  return (
    <div>
      <h1 className={styles.title}>Match History</h1>
      <p className={styles.subtitle}>Every shade match made across your clients.</p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Client</th>
              <th scope="col">Foundation</th>
              <th scope="col">Shade</th>
              <th scope="col">Match score</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            {mockMatches.map((match) => (
              <tr key={match.id}>
                <th scope="row" className={styles.client}>
                  {match.clientName}
                </th>
                <td>
                  {match.brand} {match.product}
                </td>
                <td>
                  <span className={styles.shadeCell}>
                    <ShadeSwatch hex={match.hex} size="sm" label={`${match.shade} swatch`} />
                    {match.shade}
                  </span>
                </td>
                <td className={styles.score}>{match.matchScore}%</td>
                <td className={styles.date}>{formatDate(match.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Matches
