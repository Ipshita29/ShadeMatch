import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import styles from './AppLayout.module.css'

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Close the mobile drawer whenever the route changes. Adjusting state
  // during render (rather than in an effect) avoids an extra render pass.
  const [lastPathname, setLastPathname] = useState(location.pathname)
  if (location.pathname !== lastPathname) {
    setLastPathname(location.pathname)
    setMobileOpen(false)
  }

  return (
    <div className={styles.shell}>
      <Navbar mobileOpen={mobileOpen} onToggleMobile={() => setMobileOpen((open) => !open)} />
      <div className={styles.body}>
        <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
        {mobileOpen && (
          <button
            type="button"
            className={styles.scrim}
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <main className={styles.main}>
          <div className={`${styles.content} animate-in`} key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
