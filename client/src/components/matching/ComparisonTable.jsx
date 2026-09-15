import ShadeSwatch from '../common/ShadeSwatch'
import styles from './ComparisonTable.module.css'

const rows = [
  { key: 'color', label: 'Color similarity', type: 'percent' },
  { key: 'depth', label: 'Depth', type: 'match' },
  { key: 'undertone', label: 'Undertone', type: 'match' },
  { key: 'hue', label: 'Hue', type: 'match' },
  { key: 'overall', label: 'Overall match score', type: 'percent', emphasize: true },
]

function MatchGlyph({ value }) {
  if (value === true) return <span className={`${styles.glyph} ${styles.yes}`}>&#10003;</span>
  if (value === 'partial') return <span className={`${styles.glyph} ${styles.partial}`}>~</span>
  return <span className={`${styles.glyph} ${styles.no}`}>&mdash;</span>
}

function ComparisonTable({ shades }) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.rowHead}>
              <span className="sr-only">Metric</span>
            </th>
            {shades.map((shade) => (
              <th scope="col" key={shade.shade}>
                <div className={styles.shadeHead}>
                  <ShadeSwatch hex={shade.hex} size="md" label={`${shade.shade} swatch`} />
                  <span>{shade.shade}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={row.emphasize ? styles.emphasize : ''}>
              <th scope="row" className={styles.rowHead}>
                {row.label}
              </th>
              {shades.map((shade) => (
                <td key={shade.shade + row.key}>
                  {row.type === 'percent' ? (
                    <span className={styles.percent}>{shade[row.key]}%</span>
                  ) : (
                    <MatchGlyph value={shade[row.key]} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ComparisonTable
