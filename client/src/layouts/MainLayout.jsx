import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'

function MainLayout() {
  return (
    <div>
      <Navbar />
      <main style={{ padding: '24px' }}>
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
