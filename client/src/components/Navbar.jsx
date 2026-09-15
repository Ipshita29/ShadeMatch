import { NavLink } from 'react-router-dom'
import styles from './Navbar.module.css'

const links = [
  { to: '/', label: 'Landing', end: true },
  { to: '/login', label: 'Login' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/clients/new', label: 'New Client' },
  { to: '/foundations', label: 'Foundations' },
  { to: '/matches', label: 'Matches' },
]

function Navbar() {
  return (
    <nav className={styles.navbar}>
      <span className={styles.brand}>ShadeMatch</span>
      <ul className={styles.links}>
        {links.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.active}` : styles.link
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Navbar
