import { useState, useEffect } from 'react'
import { listTools, toggleTool, testTool } from '../api'

export default function Toolbox() {
  const [tools, setTools] = useState([])
  const [testing, setTesting] = useState({}) // { toolId: true }
  const [testResults, setTestResults] = useState({}) // { toolId: string }
  const [testQueries, setTestQueries] = useState({}) // { toolId: string }

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const t = await listTools()
      setTools(t)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleToggle(toolId) {
    try {
      const res = await toggleTool(toolId)
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, enabled: res.enabled } : t))
    } catch (e) {
      console.error(e)
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
    search: { label: '🔍 Search', color: '#6366f1' },
    fetch: { label: '📥 Data Fetching', color: '#14b8a6' },
    academic: { label: '🎓 Academic', color: '#a855f7' },
    compute: { label: '⚡ Compute', color: '#f59e0b' },
  }

  const enabledCount = tools.filter(t => t.enabled).length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🧰 Agent Toolbox</h1>
        <p className="page-subtitle">
          Enable skills for your research agents. Active tools are available during simulation runs.
        </p>
        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{
            background: enabledCount > 0 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(100,116,139,0.15)',
            color: enabledCount > 0 ? '#34d399' : '#64748b',
            padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
          }}>
            {enabledCount} / {tools.length} Active
          </span>
        </div>
      </div>

      {/* Tool Cards */}
      <div className="card-grid">
        {tools.map(tool => {
          const cat = categories[tool.category] || { label: tool.category, color: '#6366f1' }
          return (
            <div key={tool.id} className="card" style={{
              borderColor: tool.enabled ? `${cat.color}40` : undefined,
              boxShadow: tool.enabled ? `0 0 20px ${cat.color}15` : undefined,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 52, height: 52, borderRadius: 12,
                    background: tool.enabled ? `${cat.color}20` : 'rgba(30,41,59,0.5)',
                    border: `1px solid ${tool.enabled ? `${cat.color}40` : 'rgba(99,102,241,0.1)'}`,
                  }}>
                    {tool.icon}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: '#f1f5f9' }}>{tool.name}</div>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 10,
                      background: `${cat.color}20`, color: cat.color,
                    }}>
                      {cat.label}
                    </span>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => handleToggle(tool.id)}
                  style={{
                    width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                    background: tool.enabled
                      ? 'linear-gradient(135deg, #059669, #34d399)'
                      : 'rgba(30, 41, 59, 0.8)',
                    position: 'relative', transition: 'all 0.3s ease',
                    boxShadow: tool.enabled ? '0 0 10px rgba(52,211,153,0.3)' : 'none',
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#fff', position: 'absolute', top: 3,
                    left: tool.enabled ? 25 : 3,
                    transition: 'left 0.3s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }} />
                </button>
              </div>

              {/* Description */}
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 16 }}>
                {tool.description}
              </p>

              {/* Test Area */}
              <div style={{ borderTop: '1px solid rgba(99,102,241,0.1)', paddingTop: 12 }}>
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
                    {testing[tool.id] ? '⏳ Testing…' : '▶ Test'}
                  </button>
                </div>

                {testResults[tool.id] && (
                  <div style={{
                    background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: 12,
                    fontSize: 12, color: '#94a3b8', maxHeight: 200, overflowY: 'auto',
                    fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    border: '1px solid rgba(99,102,241,0.1)',
                  }}>
                    {testResults[tool.id]}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {tools.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🧰</div>
          <div className="empty-title">Loading tools…</div>
          <div className="empty-text">Connecting to tool registry</div>
        </div>
      )}
    </div>
  )
}
