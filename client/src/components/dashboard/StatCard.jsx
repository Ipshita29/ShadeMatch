import styles from './StatCard.module.css'

function StatCard({ label, value }) {
  return (
    <div className={styles.stat}>
      <p className={styles.value}>{value}</p>
      <p className={styles.label}>{label}</p>
    </div>
  )
}

export default StatCard
