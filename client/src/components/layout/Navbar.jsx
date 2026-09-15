import Logo from '../common/Logo'
import { MenuIcon, CloseIcon } from './navIcons'
import { artist } from '../../utils/mockData'
import styles from './Navbar.module.css'

function Navbar({ mobileOpen, onToggleMobile }) {
  return (
    <header className={styles.navbar}>
      <button
        type="button"
        className={styles.menuButton}
        onClick={onToggleMobile}
        aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      <Logo />

      <div className={styles.profile}>
        <span className={styles.profileName}>{artist.name}</span>
        <span className={styles.avatar} aria-hidden="true">
          {artist.initials}
        </span>
      </div>
    </header>
  )
}

export default Navbar
