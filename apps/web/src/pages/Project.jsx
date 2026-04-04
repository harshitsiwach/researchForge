import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, uploadSeed, listSeeds, generateSeed, listRuns, getFeedTypes, getProjectFeeds, configureProjectFeeds, testFeedSource, listAutoResearchJobs, createAutoResearch } from '../api'
import { toast } from '../components/Toast'

export default function Project() {
  const { wsId, projId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [seeds, setSeeds] = useState([])
  const [runs, setRuns] = useState([])
  const [arJobs, setArJobs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const fileRef = useRef()

  const [feedTypes, setFeedTypes] = useState([])
  const [feeds, setFeeds] = useState([])
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [newFeed, setNewFeed] = useState({ type: 'news', label: 'News Headline Monitor', icon: '📰', query: '', url: '', name: '' })
  const [testingFeed, setTestingFeed] = useState(false)

  useEffect(() => { load() }, [projId, wsId])

  async function load() {
    try {
      const p = await getProject(wsId, projId)
      setProject(p)
      setSeeds(p.seeds || [])
      setRuns(p.runs || [])
      
      const jobs = await listAutoResearchJobs(projId)
      setArJobs(jobs || [])
      
      const ft = await getFeedTypes()
      setFeedTypes(ft)
      const f = await getProjectFeeds(projId)
      setFeeds(f)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load project')
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
      toast.success('Seed uploaded successfully')
    } catch (e) {
      toast.error(e.message || 'Failed to upload seed')
    }
    setUploading(false)
    fileRef.current.value = ''
  }

  async function handleGenerate() {
    if (!project?.question) {
      toast.warning('Please set a research question first')
      return
    }
    setGenerating(true)
    try {
      await generateSeed(projId)
      const s = await listSeeds(projId)
      setSeeds(s)
      toast.success('Seed generated successfully')
    } catch (e) {
      toast.error(e.message || 'Failed to generate seed')
    }
    setGenerating(false)
  }

  async function handleAddFeed() {
    if (!newFeed.name) return toast.warning('Please name this feed source')
    
    if (['rss', 'websocket', 'api_poll'].includes(newFeed.type) && !newFeed.url) {
      return toast.warning('This feed type requires a URL')
    }
    
    if ((newFeed.type === 'news' || newFeed.type === 'web') && !newFeed.query) {
      return toast.warning('This feed type requires a search query')
    }
    
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
      toast.success('Feed source added')
    } catch (e) {
      toast.error('Failed to save feed')
    }
  }

  async function handleRemoveFeed(id) {
    const updated = feeds.filter(f => f.id !== id)
    try {
      await configureProjectFeeds(projId, updated)
      setFeeds(updated)
      toast.info('Feed source removed')
    } catch (e) {
      toast.error('Failed to remove feed')
    }
  }

  async function handleTestFeed(source) {
    setTestingFeed(true)
    try {
      const res = await testFeedSource(source)
      if (res.success) {
        toast.success(`Test successful! Found ${res.count} items`)
      } else {
        toast.error(`Test failed: ${res.error}`)
      }
    } catch (e) {
      toast.error('Test request failed')
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
          <div style={{ padding: '16px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-muted)' }}>Source Type</label>
                <select style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                  value={newFeed.type}
                  onChange={e => {
                    const t = feedTypes.find(ft => ft.type === e.target.value)
                    setNewFeed({...newFeed, type: t.type, label: t.label, icon: t.icon})
                  }}>
                  {feedTypes.map(t => <option key={t.type} value={t.type}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-muted)' }}>Display Name</label>
                <input type="text" style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                  placeholder="e.g. AI News Feed"
                  value={newFeed.name} onChange={e => setNewFeed({...newFeed, name: e.target.value})} />
              </div>
            </div>
            
            {(newFeed.type === 'news' || newFeed.type === 'web') && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-muted)' }}>Search Query</label>
                <input type="text" style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                  placeholder="Enter keyword to monitor..."
                  value={newFeed.query} onChange={e => setNewFeed({...newFeed, query: e.target.value})} />
              </div>
            )}
            
            {['rss', 'websocket', 'api_poll'].includes(newFeed.type) && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-muted)' }}>
                  {newFeed.type === 'websocket' ? 'WebSocket WSS URL' : newFeed.type === 'api_poll' ? 'API Endpoint URL' : 'RSS/Atom URL'}
                </label>
                <input type="text" style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                  placeholder={newFeed.type === 'websocket' ? 'wss://...' : 'https://...'}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                      <span>{fType?.icon || '📡'}</span> {f.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {['rss', 'websocket', 'api_poll'].includes(f.type) ? f.url : `Query: "${f.query}"`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
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

      {/* Launch Options */}
      <h2 style={{ fontSize: '14px', color: 'var(--text-neon)', letterSpacing: '0.1em', marginBottom: '12px' }}>DEPLOYMENT OPTIONS</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px', marginBottom: '32px' }}>
        
        {/* Launch Simulation Card */}
        <div 
          className="card" 
          style={{ cursor: 'pointer', padding: '40px 24px', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={() => navigate(`/workspace/${wsId}/project/${projId}/run/new`)}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && navigate(`/workspace/${wsId}/project/${projId}/run/new`)}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px', filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.4))' }}>🚀</div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>Simulation Lobby</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '300px' }}>
            Instantiate a finite or endless multi-agent debate based on your seed materials and configured live data streams.
          </p>
        </div>

        {/* Launch Auto-Researcher Card */}
        <div 
          className="card" 
          style={{ cursor: 'pointer', padding: '40px 24px', border: '1px solid var(--text-neon)', background: 'rgba(0, 255, 163, 0.05)', boxShadow: '0 0 30px rgba(0, 255, 163, 0.05)' }}
          onClick={async () => {
            const topic = window.prompt("Enter a topic for the Auto-Researcher to investigate:")
            if(topic) {
              try {
                const res = await createAutoResearch(projId, topic)
                navigate(`/auto_research/${res.job_id}`)
              } catch(e) { toast.error("Failed to start Auto-Researcher") }
            }
          }}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.click()}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 50px rgba(0, 255, 163, 0.15)' }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 163, 0.05)' }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px', filter: 'drop-shadow(0 0 20px rgba(0,255,163,0.4))' }}>🤖</div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-neon)', marginBottom: '12px' }}>Auto-Researcher</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '300px' }}>
            Deploy a master agent that uses tools to gather data and programmatically spawns internal debates to peer-review its findings.
          </p>
        </div>
        
      </div>

      {runs.filter(r => r.status === 'completed').length >= 2 && (
        <div className="flex justify-end mb-4">
          <button className="btn btn-secondary"
            onClick={() => navigate(`/workspace/${wsId}/project/${projId}/compare`)}>
            ⚖️ Compare Runs
          </button>
        </div>
      )}

      {/* Auto-Research Jobs */}
      {arJobs.length > 0 && (
        <div className="card mb-4" style={{ borderColor: 'var(--text-neon)' }}>
          <div className="card-header">
            <div className="card-title" style={{ color: 'var(--text-neon)' }}>🤖 Auto-Researcher Jobs</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Job ID</th>
                  <th scope="col">Topic</th>
                  <th scope="col">Status</th>
                  <th scope="col">Started</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {arJobs.map(j => (
                  <tr key={j.id}>
                    <td className="font-mono text-sm">{j.id}</td>
                    <td style={{ maxWidth: 200 }} className="truncate" title={j.topic}>{j.topic}</td>
                    <td>
                      <span className={`badge badge-${j.status}`}>
                        <span className="badge-dot" />
                        {j.status}
                      </span>
                    </td>
                    <td className="text-sm text-muted">{j.started_at?.slice(0, 19)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/auto_research/${j.id}`)}>
                        {j.status === 'running' ? 'Monitor →' : 'View →'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  <th scope="col">Run ID</th>
                  <th scope="col">Mode</th>
                  <th scope="col">Status</th>
                  <th scope="col">Started</th>
                  <th scope="col">Actions</th>
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
