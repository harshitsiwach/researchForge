import { useState, useEffect } from 'react'
import { listTools, toggleTool, testTool } from '../api'
import { toast } from '../components/Toast'
import PageLoading from '../components/PageLoading'
import { Search, Download, GraduationCap, Zap, Wrench, Play, Clock, AlertCircle } from 'lucide-react'

export default function Toolbox() {
  const [tools, setTools] = useState([])
  const [testing, setTesting] = useState({})
  const [testResults, setTestResults] = useState({})
  const [testQueries, setTestQueries] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const t = await listTools()
      setTools(t)
    } catch (e) {
      console.error(e)
      setError('Failed to load tools')
      toast.error('Failed to load tool registry')
    }
    setLoading(false)
  }

  async function handleToggle(toolId) {
    try {
      const res = await toggleTool(toolId)
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, enabled: res.enabled } : t))
      toast.info(res.enabled ? 'Tool enabled' : 'Tool disabled')
    } catch (e) {
      toast.error('Failed to toggle tool')
    }
  }

  async function handleTest(toolId) {
    const query = testQueries[toolId] || getDefaultQuery(toolId)
    setTesting(prev => ({ ...prev, [toolId]: true }))
    setTestResults(prev => ({ ...prev, [toolId]: null }))
    try {
      const res = await testTool(toolId, query)
      setTestResults(prev => ({ ...prev, [toolId]: res.result }))
    } catch (e) {
      setTestResults(prev => ({ ...prev, [toolId]: `Error: ${e.message}` }))
    }
    setTesting(prev => ({ ...prev, [toolId]: false }))
  }

  function getDefaultQuery(toolId) {
    const defaults = {
      web_search: 'latest AI developments 2025',
      url_scraper: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
      wikipedia: 'Machine Learning',
      arxiv_search: 'large language models',
      news_search: 'artificial intelligence',
      calculator: 'sqrt(144) + pi * 2',
    }
    return defaults[toolId] || 'test query'
  }

  const categories = {
    search: { label: 'Search', color: '#6750a4', icon: Search },
    fetch: { label: 'Data Fetching', color: '#7d5260', icon: Download },
    academic: { label: 'Academic', color: '#625b71', icon: GraduationCap },
    compute: { label: 'Compute', color: '#b3261e', icon: Zap },
  }

  const fallbackIcon = Wrench

  const enabledCount = tools.filter(t => t.enabled).length

  if (loading) return <PageLoading message="Loading tools..." />

  if (error && tools.length === 0) {
    return (
      <div className="empty-state animate-in">
        <div className="empty-icon"><AlertCircle size={48} /></div>
        <h2 className="empty-title">Tool Registry Unavailable</h2>
        <p className="empty-text">{error}. Please ensure the backend API is running.</p>
        <button className="btn btn-primary" onClick={load} style={{ marginTop: '24px' }}>Retry</button>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Agent Toolbox</h1>
        <p className="page-subtitle">
          Enable tools for your research agents. Active tools are available during simulation runs.
        </p>
        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{
            background: enabledCount > 0 ? 'var(--success-container)' : 'var(--surface-container-highest)',
            color: enabledCount > 0 ? 'var(--success)' : 'var(--on-surface-variant-muted)',
            padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
          }}>
            {enabledCount} / {tools.length} Active
          </span>
        </div>
      </div>

      {/* Tool Cards */}
      <div className="card-grid">
        {tools.map(tool => {
          const cat = categories[tool.category] || { label: tool.category, color: '#6750a4', icon: fallbackIcon }
          const CatIcon = cat.icon
          return (
            <div key={tool.id} className="card" style={{
              borderColor: tool.enabled ? cat.color + '40' : 'var(--outline-variant)',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 48, height: 48, borderRadius: 12,
                    background: tool.enabled ? cat.color + '15' : 'var(--surface-container-highest)',
                    border: `1px solid ${tool.enabled ? cat.color + '30' : 'var(--outline-variant)'}`,
                    color: tool.enabled ? cat.color : 'var(--on-surface-variant-muted)',
                  }}>
                    <CatIcon size={22} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--on-surface)' }}>{tool.name}</div>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 10,
                      background: cat.color + '15', color: cat.color, fontWeight: 500,
                    }}>
                      {cat.label}
                    </span>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => handleToggle(tool.id)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: tool.enabled ? cat.color : 'var(--surface-container-highest)',
                    position: 'relative', transition: 'all 0.2s ease',
                    boxShadow: tool.enabled ? `0 0 8px ${cat.color}30` : 'none',
                  }}
                  aria-label={`Toggle ${tool.name}`}
                  aria-pressed={tool.enabled}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--on-primary)', position: 'absolute', top: 3,
                    left: tool.enabled ? 23 : 3,
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px var(--shadow)',
                  }} />
                </button>
              </div>

              {/* Description */}
              <p style={{ fontSize: 13, color: 'var(--on-surface-variant-muted)', lineHeight: 1.6, marginBottom: 16 }}>
                {tool.description}
              </p>

              {/* Test Area */}
              <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: 12 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={getDefaultQuery(tool.id)}
                    value={testQueries[tool.id] || ''}
                    onChange={e => setTestQueries(prev => ({ ...prev, [tool.id]: e.target.value }))}
                    style={{ flex: 1, padding: '6px 10px', fontSize: 12 }}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleTest(tool.id)}
                    disabled={testing[tool.id]}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {testing[tool.id] ? <Clock size={14} /> : <Play size={14} />} {testing[tool.id] ? 'Testing' : 'Test'}
                  </button>
                </div>

                {testResults[tool.id] && (
                  <div style={{
                    background: 'var(--surface-container-highest)', borderRadius: 8, padding: 12,
                    fontSize: 12, color: 'var(--on-surface-variant)', maxHeight: 200, overflowY: 'auto',
                    fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    border: '1px solid var(--outline-variant)',
                  }}>
                    {testResults[tool.id]}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
