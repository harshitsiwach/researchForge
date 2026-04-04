import { Routes, Route, NavLink } from 'react-router-dom'
import { Home as HomeIcon, Wrench, Settings as SettingsIcon, Moon, Sun } from 'lucide-react'
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
      <aside className="sidebar" role="navigation" aria-label="Main navigation">
        <div className="sidebar-logo">
          Research<span>Forge</span>
        </div>
        
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><HomeIcon size={20} /></span> <span>Home</span>
        </NavLink>
        <NavLink to="/toolbox" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><Wrench size={20} /></span> <span>Toolbox</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><SettingsIcon size={20} /></span> <span>Settings</span>
        </NavLink>

        <div style={{ flex: 1 }} />
        
        {/* Theme toggle */}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          title={`${isDark ? 'Light' : 'Dark'} mode`}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        
        <div className="lab-status" style={{ padding: '0 12px' }}>
          <div style={{
            fontSize: '12px',
            color: 'var(--on-surface-variant-muted)',
            fontFamily: 'var(--font-body)',
          }}>
            <div style={{ color: 'var(--success)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge-dot" style={{ width: 6, height: 6 }}></span>
              System Online
            </div>
            v0.1.0
          </div>
        </div>
      </aside>

      <main id="main-content" className="main-content" style={{ paddingBottom: '100px' }}>
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
    </div>
  )
}

export default App
