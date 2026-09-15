import styles from './ShadeSwatch.module.css'

function ShadeSwatch({ hex, size = 'md', selected = false, label }) {
  return (
    <span
      className={`${styles.swatch} ${styles[size]} ${selected ? styles.selected : ''}`}
      style={{ backgroundColor: hex }}
      role="img"
      aria-label={label || `Shade swatch ${hex}`}
    />
  )
}

export default ShadeSwatch
