import ShadeSwatch from '../common/ShadeSwatch'
import styles from './MatchComparison.module.css'

function swatchColor(rgb) {
  return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : null
}

const ROWS = [
  { key: 'score', label: 'Match Score', render: (m) => m.score },
  { key: 'deltaE', label: 'Delta E', render: (m) => m.deltaE },
  { key: 'depth', label: 'Depth', render: (m) => m.depth },
  { key: 'undertone', label: 'Undertone', render: (m) => m.undertone },
  { key: 'hue', label: 'Hue', render: (m) => m.hue },
]

// The ranking itself (order of `matches`) is the only "winner" this
// component communicates — it never re-derives or re-declares one.
function MatchComparison({ matches }) {
  if (!matches?.length) return null

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.rowHead}>
              <span className="sr-only">Metric</span>
            </th>
            {matches.map((match, index) => (
              <th scope="col" key={match.shadeId}>
                <div className={styles.shadeHead}>
                  <ShadeSwatch hex={swatchColor(match.color?.rgb)} size="md" label={`${match.name} swatch`} />
                  <span className={styles.rank}>#{index + 1}</span>
                  <span className={styles.shadeName}>{match.name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.key} className={row.key === 'score' ? styles.emphasize : ''}>
              <th scope="row" className={styles.rowHead}>
                {row.label}
              </th>
              {matches.map((match) => (
                <td key={match.shadeId + row.key}>{row.render(match)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default MatchComparison
