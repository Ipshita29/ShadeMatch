import { useState } from 'react'
import styles from './MatchScore.module.css'

// UI-only presentational threshold for visually emphasizing a strong score.
// This is NOT a backend match-quality classification (the backend's only
// authoritative quality signal is the `status` field — see matching_engine
// .py) — it just decides whether the number renders in the accent tone.
const STRONG_SCORE_UI_THRESHOLD = 85

function InfoTip({ label, children }) {
  const [open, setOpen] = useState(false)

  return (
    <span className={styles.infoTip}>
      <button
        type="button"
        className={styles.infoButton}
        aria-expanded={open}
        aria-label={open ? `Hide explanation: ${label}` : `Explain: ${label}`}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>
      {open && <span className={styles.infoBubble}>{children}</span>}
    </span>
  )
}

function MatchScore({ score, deltaE, size = 'lg' }) {
  const strong = size === 'lg' && typeof score === 'number' && score >= STRONG_SCORE_UI_THRESHOLD

  return (
    <div className={`${styles.wrap} ${styles[size]}`}>
      <div className={styles.metric}>
        <span className={`${styles.value} ${strong ? styles.strong : ''}`}>{score}</span>
        <span className={styles.label}>
          Match Score
          <InfoTip label="Match Score">
            Match Score combines color distance, depth, undertone, hue and shade data quality.
            It is not an accuracy percentage or a probability.
          </InfoTip>
        </span>
      </div>

      {typeof deltaE === 'number' && (
        <div className={styles.metric}>
          <span className={styles.value}>{deltaE}</span>
          <span className={styles.label}>
            Delta E
            <InfoTip label="Delta E">Lower Delta E means the measured colors are closer.</InfoTip>
          </span>
        </div>
      )}
    </div>
  )
}

export default MatchScore
