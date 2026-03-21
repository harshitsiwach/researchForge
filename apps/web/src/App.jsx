import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Project from './pages/Project'
import RunBuilder from './pages/RunBuilder'
import RunMonitor from './pages/RunMonitor'
import Results from './pages/Results'
import Compare from './pages/Compare'
import Settings from './pages/Settings'

function App() {
  const location = useLocation()

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          ResearchForge
        </div>
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive && location.pathname === '/' ? 'active' : ''}`}>
          <span className="nav-icon">🏠</span> Home
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">⚙️</span> Settings
        </NavLink>

        <div style={{ flex: 1 }} />
        <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
          Local-first research platform
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workspace/:wsId/project/:projId" element={<Project />} />
          <Route path="/workspace/:wsId/project/:projId/run/new" element={<RunBuilder />} />
          <Route path="/run/:runId" element={<RunMonitor />} />
          <Route path="/run/:runId/results" element={<Results />} />
          <Route path="/workspace/:wsId/project/:projId/compare" element={<Compare />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
