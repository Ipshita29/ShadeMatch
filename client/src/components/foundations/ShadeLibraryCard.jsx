import { Link } from 'react-router-dom'
import ShadeSwatch from '../common/ShadeSwatch'
import Badge from '../common/Badge'
import styles from './ShadeLibraryCard.module.css'

function ShadeLibraryCard({ shade }) {
  const rgb = shade.color?.rgb
  const swatchColor = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : null
  const isEstimated = shade.calibration?.status !== 'calibrated'

  return (
    <Link to={`/foundations/shades/${shade._id}`} className={styles.card}>
      <p className={styles.brand}>{shade.brandName}</p>
      <p className={styles.product}>{shade.productName}</p>

      <div className={styles.swatchRow}>
        {swatchColor ? (
          <ShadeSwatch hex={swatchColor} size="lg" label={`${shade.name} swatch`} />
        ) : (
          <span className={styles.placeholderSwatch} role="img" aria-label="Color unavailable" />
        )}
        <div>
          <h3 className={styles.name}>{shade.name}</h3>
          {isEstimated && <span className={styles.estimatedTag}>Estimated color</span>}
        </div>
      </div>

      <div className={styles.tags}>
        <Badge tone="sage">{shade.undertone}</Badge>
        <Badge tone="outline">{shade.depth}</Badge>
      </div>
    </Link>
  )
}

export default ShadeLibraryCard
