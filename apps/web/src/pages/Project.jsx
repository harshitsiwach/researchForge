import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, uploadSeed, listSeeds, generateSeed, listRuns, getFeedTypes, getProjectFeeds, configureProjectFeeds, testFeedSource } from '../api'

export default function Project() {
  const { wsId, projId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [seeds, setSeeds] = useState([])
  const [runs, setRuns] = useState([])
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const fileRef = useRef()

  const [feedTypes, setFeedTypes] = useState([])
  const [feeds, setFeeds] = useState([])
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [newFeed, setNewFeed] = useState({ type: 'news', label: 'News Headline Monitor', icon: '📰', query: '', url: '', name: '' })
  const [testingFeed, setTestingFeed] = useState(false)

  useEffect(() => { load() }, [projId])

  async function load() {
    try {
      const p = await getProject(wsId, projId)
      setProject(p)
      setSeeds(p.seeds || [])
      setRuns(p.runs || [])
      
      const ft = await getFeedTypes()
      setFeedTypes(ft)
      const f = await getProjectFeeds(projId)
      setFeeds(f)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadSeed(projId, file)
      const s = await listSeeds(projId)
      setSeeds(s)
    } catch (e) {
      console.error(e)
    }
    setUploading(false)
    fileRef.current.value = ''
  }

  async function handleGenerate() {
    if (!project?.question) {
      alert("Please set a research question first.")
      return
    }
    setGenerating(true)
    try {
      await generateSeed(projId)
      const s = await listSeeds(projId)
      setSeeds(s)
    } catch (e) {
      console.error(e)
      alert(e.message || "Failed to generate seed")
    }
    setGenerating(false)
  }

  async function handleAddFeed() {
    if (!newFeed.name) return alert("Please name this feed source")
    if (newFeed.type === 'rss' && !newFeed.url) return alert("RSS requires a URL")
    if ((newFeed.type === 'news' || newFeed.type === 'web') && !newFeed.query) return alert("This feed type requires a search query")
    
    const newSource = {
      id: "fs_" + Date.now(),
      type: newFeed.type,
      name: newFeed.name,
      query: newFeed.query,
      url: newFeed.url
    }
    const updated = [...feeds, newSource]
    try {
      await configureProjectFeeds(projId, updated)
      setFeeds(updated)
      setShowAddFeed(false)
      setNewFeed({ ...newFeed, query: '', url: '', name: '' })
    } catch (e) {
      alert("Failed to save feed")
    }
  }

  async function handleRemoveFeed(id) {
    const updated = feeds.filter(f => f.id !== id)
    try {
      await configureProjectFeeds(projId, updated)
      setFeeds(updated)
    } catch (e) {
      alert("Failed to remove feed")
    }
  }

  async function handleTestFeed(source) {
    setTestingFeed(true)
    try {
      const res = await testFeedSource(source)
      if (res.success) {
        alert(`Test successful! Found ${res.count} items. Sample: ${res.sample?.title}`)
      } else {
        alert(`Test failed: ${res.error}`)
      }
    } catch (e) {
      alert("Test request failed")
    }
    setTestingFeed(false)
  }

  if (!project) return <div className="flex items-center gap-3"><div className="spinner" /> Loading project...</div>

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate('/')}>← Workspaces</button>
        <h1 className="page-title">{project.name}</h1>
        <p className="page-subtitle">{project.question || 'No research question set'}</p>
      </div>

      {/* Seeds */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="card-title">📄 Seed Materials</div>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={handleGenerate}
              disabled={generating || uploading}
              title="Use the LLM to auto-generate a background brief based on the question">
              {generating ? '✨ Generating...' : '✨ Auto-Generate Seed'}
            </button>
            <input type="file" ref={fileRef} onChange={handleUpload}
              accept=".md,.txt,.pdf,.csv" style={{ display: 'none' }} />
            <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}
              disabled={uploading || generating}>
              {uploading ? 'Uploading...' : '+ Upload Seed'}
            </button>
          </div>
        </div>
        {seeds.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px' }}>
            <div className="empty-icon">📎</div>
            <p className="empty-text">Upload markdown, text, or PDF files as seed materials for your research.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {seeds.map(s => (
              <div key={s.id} className="flex items-center justify-between"
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)' }}>
                <span className="text-sm">{s.filename}</span>
                <span className="text-sm text-muted">{s.created_at?.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Data Feeds */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="card-title">📡 Live Data Sources</div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddFeed(!showAddFeed)}>
            {showAddFeed ? 'Cancel' : '+ Add Source'}
          </button>
        </div>
        
        {showAddFeed && (
          <div className="p-4 mb-4 border-b border-white/10" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="grid grid-cols-2 gap-4 mb-4" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
              <div>
                <label className="text-sm text-muted mb-1 block" style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Source Type</label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                  value={newFeed.type}
                  onChange={e => {
                    const t = feedTypes.find(ft => ft.type === e.target.value)
                    setNewFeed({...newFeed, type: t.type, label: t.label, icon: t.icon})
                  }}>
                  {feedTypes.map(t => <option key={t.type} value={t.type}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted mb-1 block" style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Display Name</label>
                <input type="text" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                  placeholder="e.g. AI News Feed"
                  value={newFeed.name} onChange={e => setNewFeed({...newFeed, name: e.target.value})} />
              </div>
            </div>
            
            {(newFeed.type === 'news' || newFeed.type === 'web') && (
              <div className="mb-4" style={{ marginBottom: '16px' }}>
                <label className="text-sm text-muted mb-1 block" style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Search Query</label>
                <input type="text" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                  placeholder="Enter keyword to monitor..."
                  value={newFeed.query} onChange={e => setNewFeed({...newFeed, query: e.target.value})} />
              </div>
            )}
            
            {newFeed.type === 'rss' && (
              <div className="mb-4" style={{ marginBottom: '16px' }}>
                <label className="text-sm text-muted mb-1 block" style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>RSS/Atom URL</label>
                <input type="text" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                  placeholder="https://..."
                  value={newFeed.url} onChange={e => setNewFeed({...newFeed, url: e.target.value})} />
              </div>
            )}
            
            <button className="btn btn-primary btn-sm mt-2" onClick={handleAddFeed}>Save Source</button>
          </div>
        )}

        {feeds.length === 0 && !showAddFeed ? (
          <div className="empty-state" style={{ padding: '32px' }}>
            <div className="empty-icon">📡</div>
            <p className="empty-text">No live data sources configured. Agents will rely solely on static seeds and the LLM's internal knowledge.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {feeds.map(f => {
              const fType = feedTypes.find(t => t.type === f.type)
              return (
                <div key={f.id} className="flex items-center justify-between"
                  style={{ padding: '12px', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)' }}>
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                      <span>{fType?.icon || '📡'}</span> {f.name}
                    </div>
                    <div className="text-xs text-muted mt-1" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {f.type === 'rss' ? f.url : `Query: "${f.query}"`}
                    </div>
                  </div>
                  <div className="flex gap-2" style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleTestFeed(f)} disabled={testingFeed}>
                      Test
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => handleRemoveFeed(f.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-4">
        <button className="btn btn-primary"
          onClick={() => navigate(`/workspace/${wsId}/project/${projId}/run/new`)}>
          🚀 Launch Run
        </button>
        {runs.filter(r => r.status === 'completed').length >= 2 && (
          <button className="btn btn-secondary"
            onClick={() => navigate(`/workspace/${wsId}/project/${projId}/compare`)}>
            ⚖️ Compare Runs
          </button>
        )}
      </div>

      {/* Runs */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🔬 Run History</div>
        </div>
        {runs.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px' }}>
            <div className="empty-icon">🧪</div>
            <p className="empty-text">No runs yet. Upload some seeds and launch your first simulation run.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.id}>
                    <td className="font-mono text-sm">{r.id}</td>
                    <td><span className="badge badge-running">{r.mode}</span></td>
                    <td>
                      <span className={`badge badge-${r.status}`}>
                        <span className="badge-dot" />
                        {r.status}
                      </span>
                    </td>
                    <td className="text-sm text-muted">{r.started_at?.slice(0, 19)}</td>
                    <td>
                      {r.status === 'running' ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/run/${r.id}`)}>
                          Monitor →
                        </button>
                      ) : r.status === 'completed' ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/run/${r.id}/results`)}>
                          Results →
                        </button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/run/${r.id}`)}>
                          View →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
