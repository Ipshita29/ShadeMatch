import styles from './ProductCard.module.css'

function ProductCard({ product, previewHexes = [] }) {
  return (
    <div className={styles.card}>
      <div className={styles.swatchStrip} aria-hidden="true">
        {previewHexes.map((hex, index) => (
          <span key={hex + index} className={styles.swatch} style={{ backgroundColor: hex }} />
        ))}
      </div>
      <p className={styles.brand}>{product.brand}</p>
      <h3 className={styles.name}>{product.name}</h3>
      <p className={styles.count}>{product.shadeCount} shades</p>
    </div>
  )
}

export default ProductCard
