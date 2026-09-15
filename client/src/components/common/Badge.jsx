import styles from './Badge.module.css'

function Badge({ children, tone = 'neutral', className = '' }) {
  return (
    <span className={`${styles.badge} ${styles[tone]} ${className}`}>
      {children}
    </span>
  )
}

export default Badge
