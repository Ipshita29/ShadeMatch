import { NavLink } from 'react-router-dom'
import {
  DashboardIcon,
  ClientsIcon,
  FoundationsIcon,
  MatchHistoryIcon,
} from './navIcons'
import styles from './Sidebar.module.css'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/clients', label: 'Clients', icon: ClientsIcon },
  { to: '/foundations', label: 'Foundations', icon: FoundationsIcon },
  { to: '/matches', label: 'Match History', icon: MatchHistoryIcon },
]

function Sidebar({ mobileOpen = false, onNavigate }) {
  return (
    <>
      <aside className={styles.sidebar} aria-label="Primary">
        <SidebarLinks onNavigate={onNavigate} />
      </aside>

      <aside
        className={`${styles.mobileSidebar} ${mobileOpen ? styles.mobileOpen : ''}`}
        aria-label="Primary"
        aria-hidden={!mobileOpen}
      >
        <SidebarLinks onNavigate={onNavigate} />
      </aside>
    </>
  )
}

function SidebarLinks({ onNavigate }) {
  return (
    <nav className={styles.nav}>
      <ul className={styles.list}>
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.active}` : styles.link
              }
            >
              <Icon className={styles.icon} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Sidebar
