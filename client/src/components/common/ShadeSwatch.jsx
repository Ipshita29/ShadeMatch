import styles from './ShadeSwatch.module.css'

// hex may be null/undefined when a shade has no reliable RGB value yet
// (see Part 6 calibration.status) — rendered as a dashed placeholder
// rather than silently showing black or an invented color.
function ShadeSwatch({ hex, size = 'md', selected = false, label }) {
  if (!hex) {
    return (
      <span
        className={`${styles.swatch} ${styles.placeholder} ${styles[size]}`}
        role="img"
        aria-label={label ? `${label} (color unavailable)` : 'Color unavailable'}
      />
    )
  }

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
