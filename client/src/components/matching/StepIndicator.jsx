import styles from './StepIndicator.module.css'

const DEFAULT_STEPS = [
  { id: 1, label: 'Client Photo' },
  { id: 2, label: 'Skin Profile' },
  { id: 3, label: 'Foundation' },
  { id: 4, label: 'Match' },
]

function StepIndicator({ current, steps = DEFAULT_STEPS, label = 'Match workflow progress' }) {
  return (
    <ol className={styles.list} aria-label={label}>
      {steps.map((step) => {
        const state =
          step.id === current ? 'current' : step.id < current ? 'done' : 'upcoming'
        return (
          <li key={step.id} className={`${styles.step} ${styles[state]}`}>
            <span className={styles.number} aria-hidden="true">
              {String(step.id).padStart(2, '0')}
            </span>
            <span className={styles.label}>{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

export default StepIndicator
