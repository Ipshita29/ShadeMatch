import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewClient from './pages/NewClient'
import SkinAnalysis from './pages/SkinAnalysis'
import FoundationSelection from './pages/FoundationSelection'
import MatchResults from './pages/MatchResults'
import ShadeComparison from './pages/ShadeComparison'
import Foundations from './pages/Foundations'
import FoundationShadeDetail from './pages/FoundationShadeDetail'
import FoundationImport from './pages/FoundationImport'
import Clients from './pages/Clients'
import Matches from './pages/Matches'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/new" element={<NewClient />} />
          <Route path="/clients/new/analysis" element={<SkinAnalysis />} />
          <Route path="/clients/new/foundation" element={<FoundationSelection />} />
          <Route path="/clients/new/results" element={<MatchResults />} />
          <Route path="/clients/new/compare" element={<ShadeComparison />} />
          <Route path="/foundations" element={<Foundations />} />
          <Route path="/foundations/import" element={<FoundationImport />} />
          <Route path="/foundations/shades/:shadeId" element={<FoundationShadeDetail />} />
          <Route path="/matches" element={<Matches />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
