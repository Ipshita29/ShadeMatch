import ProgressBar from '../common/ProgressBar'
import Badge from '../common/Badge'
import styles from './SkinProfilePanel.module.css'

function SkinProfilePanel({ profile, compact = false }) {
  const { depth, depthValue, undertone, hue, confidence } = profile

  return (
    <div className={styles.panel}>
      {!compact && <p className={styles.eyebrow}>Skin Profile</p>}

      <div className={styles.grid}>
        <div className={styles.field}>
          <ProgressBar label="Depth" value={depthValue} tone="rose" />
          <p className={styles.fieldValue}>{depth}</p>
        </div>

        <div className={styles.field}>
          <p className={styles.fieldLabel}>Undertone</p>
          <Badge tone="sage">{undertone}</Badge>
        </div>

        <div className={styles.field}>
          <p className={styles.fieldLabel}>Hue</p>
          <Badge tone="rose">{hue}</Badge>
        </div>

        <div className={styles.field}>
          <p className={styles.fieldLabel}>Confidence</p>
          <p className={styles.fieldValue}>{confidence}%</p>
        </div>
      </div>
    </div>
  )
}

export default SkinProfilePanel
