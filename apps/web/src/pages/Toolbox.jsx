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
    try { const t = await listTools(); setTools(t) }
    catch (e) { console.error(e); setError('Failed to load tools'); toast.error('Failed to load tool registry') }
    setLoading(false)
  }

  async function handleToggle(toolId) {
    try {
      const res = await toggleTool(toolId)
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, enabled: res.enabled } : t))
      toast.info(res.enabled ? 'Tool enabled' : 'Tool disabled')
    } catch (e) { toast.error('Failed to toggle tool') }
  }

  async function handleTest(toolId) {
    const query = testQueries[toolId] || getDefaultQuery(toolId)
    setTesting(prev => ({ ...prev, [toolId]: true }))
    setTestResults(prev => ({ ...prev, [toolId]: null }))
    try { const res = await testTool(toolId, query); setTestResults(prev => ({ ...prev, [toolId]: res.result })) }
    catch (e) { setTestResults(prev => ({ ...prev, [toolId]: `Error: ${e.message}` })) }
    setTesting(prev => ({ ...prev, [toolId]: false }))
  }

  function getDefaultQuery(toolId) {
    const defaults = { web_search: 'latest AI developments 2025', url_scraper: 'https://en.wikipedia.org/wiki/Artificial_intelligence', wikipedia: 'Machine Learning', arxiv_search: 'large language models', news_search: 'artificial intelligence', calculator: 'sqrt(144) + pi * 2' }
    return defaults[toolId] || 'test query'
  }

  const categories = {
    search: { label: 'Search', color: '#00F0FF', icon: Search },
    fetch: { label: 'Data Fetching', color: '#FFC9F4', icon: Download },
    academic: { label: 'Academic', color: '#b9cacb', icon: GraduationCap },
    compute: { label: 'Compute', color: '#ffb4ab', icon: Zap },
  }

  const enabledCount = tools.filter(t => t.enabled).length
  const fallbackIcon = Wrench

  if (loading) return <PageLoading message="LOADING_TOOLS..." />

  if (error && tools.length === 0) {
    return (
      <div className="empty-state animate-in">
        <div className="empty-icon"><AlertCircle size={48} /></div>
        <h2 className="empty-title">Tool Registry Unavailable</h2>
        <p className="empty-text">{error}. Please ensure the backend API is running.</p>
        <button className="btn btn-primary manga-border" onClick={load} style={{ marginTop: '24px' }}>Retry</button>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Agent Toolbox</h1>
        <p className="page-subtitle">Enable tools for your research agents. Active tools are available during simulation runs.</p>
        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ background: enabledCount > 0 ? 'var(--secondary-container)' : 'var(--surface-container-highest)', color: enabledCount > 0 ? 'var(--ink-black)' : 'var(--on-surface-variant)', padding: '4px 12px', fontSize: 12, fontWeight: 900, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {enabledCount} / {tools.length} Active
          </span>
        </div>
      </div>

      <div className="card-grid">
        {tools.map(tool => {
          const cat = categories[tool.category] || { label: tool.category, color: '#00F0FF', icon: fallbackIcon }
          const CatIcon = cat.icon
          return (
            <div key={tool.id} className="card" style={{ borderColor: tool.enabled ? cat.color + '40' : 'var(--ink-black)', borderTop: `4px solid ${tool.enabled ? cat.color : 'var(--outline-variant)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, background: tool.enabled ? cat.color + '15' : 'var(--surface-container-highest)', border: `2px solid ${tool.enabled ? cat.color + '30' : 'var(--outline-variant)'}`, color: tool.enabled ? cat.color : 'var(--on-surface-variant-muted)' }}>
                    <CatIcon size={22} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--on-surface)', textTransform: 'uppercase', fontFamily: 'var(--font-label)' }}>{tool.name}</div>
                    <span style={{ fontSize: 10, padding: '2px 8px', background: cat.color + '15', color: cat.color, fontWeight: 700, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat.label}</span>
                  </div>
                </div>
                <button onClick={() => handleToggle(tool.id)} style={{ width: 44, height: 24, borderRadius: 0, border: '2px solid var(--ink-black)', cursor: 'pointer', background: tool.enabled ? cat.color : 'var(--surface-container-highest)', position: 'relative', transition: 'all 0.15s ease' }} aria-label={`Toggle ${tool.name}`} aria-pressed={tool.enabled}>
                  <div style={{ width: 16, height: 16, background: 'var(--ink-black)', position: 'absolute', top: 2, left: tool.enabled ? 24 : 2, transition: 'left 0.15s ease' }} />
                </button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', lineHeight: 1.6, marginBottom: 16 }}>{tool.description}</p>
              <div style={{ borderTop: '2px solid var(--outline-variant)', paddingTop: 12 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="text" className="form-input" placeholder={getDefaultQuery(tool.id)} value={testQueries[toolId] || ''} onChange={e => setTestQueries(prev => ({ ...prev, [tool.id]: e.target.value }))} style={{ flex: 1, padding: '6px 10px', fontSize: 12 }} />
                  <button className="btn btn-ghost btn-sm" onClick={() => handleTest(tool.id)} disabled={testing[tool.id]} style={{ whiteSpace: 'nowrap' }}>
                    {testing[tool.id] ? <Clock size={14} /> : <Play size={14} />} {testing[tool.id] ? 'Testing' : 'Test'}
                  </button>
                </div>
                {testResults[tool.id] && (
                  <div style={{ background: 'var(--ink-black)', borderRadius: 0, padding: 12, fontSize: 12, color: 'var(--on-surface-variant)', maxHeight: 200, overflowY: 'auto', fontFamily: "'Space Grotesk', monospace", lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '2px solid var(--outline-variant)' }}>
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
