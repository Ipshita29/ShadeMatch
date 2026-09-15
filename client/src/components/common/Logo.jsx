import { Link } from 'react-router-dom'
import styles from './Logo.module.css'

function Logo({ to = '/', size = 'md' }) {
  return (
    <Link to={to} className={`${styles.logo} ${styles[size]}`} aria-label="ShadeMatch home">
      <span className={styles.mark} aria-hidden="true" />
      ShadeMatch
    </Link>
  )
}

export default Logo
