import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Project from './pages/Project'
import RunBuilder from './pages/RunBuilder'
import RunMonitor from './pages/RunMonitor'
import Results from './pages/Results'
import Compare from './pages/Compare'
import Settings from './pages/Settings'
import Toolbox from './pages/Toolbox'
import AutoResearchMonitor from './pages/AutoResearchMonitor'
import GlobalActiveTaskBar from './components/GlobalActiveTaskBar'

function App() {
  const location = useLocation()

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          Research<span>Forge</span>
        </div>
        
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive && location.pathname === '/' ? 'active' : ''}`}>
          <span className="nav-icon">⬡</span> <span>Home</span>
        </NavLink>
        <NavLink to="/toolbox" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🛠</span> <span>Toolbox</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">⌥</span> <span>Settings</span>
        </NavLink>

        <div style={{ flex: 1 }} />
        
        <div style={{ padding: '0 12px' }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            <div style={{ color: 'var(--text-neon)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge-dot" style={{ width: 6, height: 6 }}></span>
              LAB STATUS: ACTIVE
            </div>
            SYSTEM v0.1.0-CYBER
          </div>
        </div>
      </aside>

      <main className="main-content" style={{ paddingBottom: '100px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workspace/:wsId/project/:projId" element={<Project />} />
          <Route path="/workspace/:wsId/project/:projId/run/new" element={<RunBuilder />} />
          <Route path="/run/:runId" element={<RunMonitor />} />
          <Route path="/run/:runId/results" element={<Results />} />
          <Route path="/workspace/:wsId/project/:projId/compare" element={<Compare />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/toolbox" element={<Toolbox />} />
          <Route path="/auto_research/:jobId" element={<AutoResearchMonitor />} />
        </Routes>

        <GlobalActiveTaskBar />
      </main>
    </div>
  )
}

export default App
