import { Routes, Route, NavLink } from 'react-router-dom'
import { Home as HomeIcon, Wrench, Settings as SettingsIcon, Sun, Moon } from 'lucide-react'
import { useThemeStore } from './store/themeStore'
import Home from './pages/Home'
import Project from './pages/Project'
import RunBuilder from './pages/RunBuilder'
import RunMonitor from './pages/RunMonitor'
import Results from './pages/Results'
import Compare from './pages/Compare'
import SettingsPage from './pages/Settings'
import Toolbox from './pages/Toolbox'
import AutoResearchMonitor from './pages/AutoResearchMonitor'
import GlobalActiveTaskBar from './components/GlobalActiveTaskBar'

function App() {
  const { theme, toggleTheme, getEffectiveTheme } = useThemeStore()
  const isDark = getEffectiveTheme() === 'dark'

  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Top Nav */}
      <nav className="top-nav">
        <NavLink to="/" className="top-nav-logo">ResearchForge</NavLink>
        <div className="top-nav-links">
          <NavLink to="/" className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
          <NavLink to="/toolbox" className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}>Toolbox</NavLink>
          <NavLink to="/settings" className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}>Settings</NavLink>
        </div>
        <div className="top-nav-actions">
          <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>

      {/* Sidebar */}
      <aside className="sidebar" role="navigation" aria-label="Main navigation">
        <div className="sidebar-header">
          <div className="sidebar-header-title">ResearchForge</div>
          <div className="sidebar-header-version">v0.1.0</div>
        </div>
        
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><HomeIcon size={18} /></span> <span>Dashboard</span>
        </NavLink>
        <NavLink to="/toolbox" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><Wrench size={18} /></span> <span>Toolbox</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><SettingsIcon size={18} /></span> <span>Settings</span>
        </NavLink>

        <div className="sidebar-cta">
          <NavLink to="/" className="btn btn-secondary w-full" style={{ fontSize: 10, padding: '8px 12px' }}>
            <span>New Workspace</span>
          </NavLink>
        </div>
        
        <div className="sidebar-status">
          <div className="sidebar-status-text">
            <div style={{ color: 'var(--success)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge-dot" style={{ width: 6, height: 6 }}></span>
              SYSTEM ONLINE
            </div>
            v0.1.0
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main id="main-content" className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workspace/:wsId/project/:projId" element={<Project />} />
          <Route path="/workspace/:wsId/project/:projId/run/new" element={<RunBuilder />} />
          <Route path="/run/:runId" element={<RunMonitor />} />
          <Route path="/run/:runId/results" element={<Results />} />
          <Route path="/workspace/:wsId/project/:projId/compare" element={<Compare />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/toolbox" element={<Toolbox />} />
          <Route path="/auto_research/:jobId" element={<AutoResearchMonitor />} />
        </Routes>

        <GlobalActiveTaskBar />
      </main>

      {/* Footer Status Bar */}
      <footer className="footer-bar">
        <div className="footer-bar-left">SYSTEM_STATUS: NOMINAL // OPERATIVE_CONNECTED</div>
        <div className="footer-bar-right">
          <a href="#">LATENCY_04MS</a>
          <a href="#">ENCRYPTION_ACTIVE</a>
          <a href="#">NODE_09</a>
        </div>
      </footer>
    </div>
  )
}

export default App
