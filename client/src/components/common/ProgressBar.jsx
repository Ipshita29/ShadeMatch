import styles from './ProgressBar.module.css'

function ProgressBar({ value, max = 100, label, tone = 'rose', showValue = false }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={styles.wrap}>
      {label && (
        <div className={styles.labelRow}>
          <span className={styles.label}>{label}</span>
          {showValue && <span className={styles.value}>{Math.round(percent)}%</span>}
        </div>
      )}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div
          className={`${styles.fill} ${styles[tone]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar
