import Button from './Button'
import styles from './StatusPanel.module.css'

function ActionButtons({ actions }) {
  if (!actions?.length) return null

  return (
    <div className={styles.actions}>
      {actions.map((action) => (
        <Button
          key={action.label}
          to={action.to}
          state={action.state}
          onClick={action.onClick}
          variant={action.variant || 'secondary'}
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}

export function LoadingState({
  title = 'Finding your closest shades…',
  steps = ['Color', 'Depth', 'Undertone', 'Hue'],
}) {
  return (
    <div className={styles.panel} role="status" aria-live="polite">
      <div className={styles.pulseRow} aria-hidden="true">
        <span className={styles.pulseDot} />
        <span className={styles.pulseDot} />
        <span className={styles.pulseDot} />
      </div>
      <p className={styles.title}>{title}</p>
      {steps.length > 0 && (
        <div className={styles.steps}>
          <span className={styles.stepsLabel}>Comparing</span>
          <ul className={styles.stepsList}>
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function EmptyState({ title, body, actions }) {
  return (
    <div className={`${styles.panel} ${styles.empty}`}>
      <p className={styles.title}>{title}</p>
      {body && <p className={styles.body}>{body}</p>}
      <ActionButtons actions={actions} />
    </div>
  )
}

export function ErrorState({ title, body, actions }) {
  return (
    <div className={`${styles.panel} ${styles.errorPanel}`} role="alert">
      <p className={styles.title}>{title}</p>
      {body && <p className={styles.body}>{body}</p>}
      <ActionButtons actions={actions} />
    </div>
  )
}
