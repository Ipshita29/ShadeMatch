import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewClient from './pages/NewClient'
import Foundations from './pages/Foundations'
import Matches from './pages/Matches'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients/new" element={<NewClient />} />
          <Route path="/foundations" element={<Foundations />} />
          <Route path="/matches" element={<Matches />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
