import styles from './DataQualityBadge.module.css'

// Mirrors the vocabulary already established in FoundationShadeDetail.jsx
// for the same Part 6 calibration.status field, so the language stays
// consistent wherever shade data quality is shown.
const LABELS = {
  calibrated: 'Calibrated shade data',
  estimated: 'Digital shade data',
  uncalibrated: 'Uncalibrated shade data',
}

function DataQualityBadge({ status }) {
  const label = LABELS[status] || 'Shade data quality unknown'

  return <span className={styles.badge}>{label}</span>
}

export default DataQualityBadge
