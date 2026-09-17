import ShadeSwatch from '../common/ShadeSwatch'
import styles from './ColorComparison.module.css'

function swatchColor(rgb) {
  return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : null
}

function ColorComparison({ clientRgb, shadeRgb, deltaE, shadeName }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.side}>
        <ShadeSwatch hex={swatchColor(clientRgb)} size="xxl" label="Client's skin color" />
        <p className={styles.sideLabel}>Client Skin</p>
      </div>

      <div className={styles.middle}>
        <span className={styles.versus} aria-hidden="true">
          vs
        </span>
        {typeof deltaE === 'number' && (
          <div className={styles.deltaBlock}>
            <span className={styles.deltaValue}>{deltaE}</span>
            <span className={styles.deltaLabel}>Delta E</span>
            <p className={styles.deltaHint}>Lower Delta E means the measured colors are closer.</p>
          </div>
        )}
      </div>

      <div className={styles.side}>
        <ShadeSwatch hex={swatchColor(shadeRgb)} size="xxl" label={`${shadeName || 'Matched shade'} color`} />
        <p className={styles.sideLabel}>Matched Shade{shadeName ? ` — ${shadeName}` : ''}</p>
      </div>
    </div>
  )
}

export default ColorComparison
