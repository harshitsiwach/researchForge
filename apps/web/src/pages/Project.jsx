import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, uploadSeed, listSeeds, generateSeed, listRuns, getFeedTypes, getProjectFeeds, configureProjectFeeds, testFeedSource, listAutoResearchJobs, createAutoResearch } from '../api'
import { toast } from '../components/Toast'
import { FileText, Sparkles, Paperclip, Rss, Rocket, Bot, Scale, Microscope, FlaskConical, ArrowLeft, Plus, Play, Trash2, TestTube } from 'lucide-react'

const feedIcons = {
  news: Rss,
  web: Rss,
  rss: Rss,
  websocket: Rss,
  api_poll: Rss,
}

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
  const [newFeed, setNewFeed] = useState({ type: 'news', label: 'News Headline Monitor', query: '', url: '', name: '' })
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
      toast.success('Seed uploaded')
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
      toast.success('Seed generated')
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

  const FeedIcon = feedIcons[newFeed.type] || Rss

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate('/')}><ArrowLeft size={16} /> Workspaces</button>
        <h1 className="page-title">{project.name}</h1>
        <p className="page-subtitle">{project.question || 'No research question set'}</p>
      </div>

      {/* Seeds */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={18} /> Seed Materials</div>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={handleGenerate}
              disabled={generating || uploading}
              title="Use the LLM to auto-generate a background brief based on the question">
              <Sparkles size={14} /> {generating ? 'Generating...' : 'Auto-Generate'}
            </button>
            <input type="file" ref={fileRef} onChange={handleUpload}
              accept=".md,.txt,.pdf,.csv" style={{ display: 'none' }} />
            <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}
              disabled={uploading || generating}>
              <Plus size={14} /> Upload Seed
            </button>
          </div>
        </div>
        {seeds.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px' }}>
            <div className="empty-icon"><Paperclip size={48} /></div>
            <p className="empty-text">Upload markdown, text, or PDF files as seed materials for your research.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {seeds.map(s => (
              <div key={s.id} className="flex items-center justify-between"
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)' }}>
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
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Rss size={18} /> Live Data Sources</div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddFeed(!showAddFeed)}>
            {showAddFeed ? 'Cancel' : '+ Add Source'}
          </button>
        </div>
        
        {showAddFeed && (
          <div style={{ padding: '16px', marginBottom: '16px', borderBottom: '1px solid var(--outline-variant)', background: 'var(--surface-container-high)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--on-surface-variant)', fontWeight: 600 }}>Source Type</label>
                <select className="form-select"
                  value={newFeed.type}
                  onChange={e => {
                    const t = feedTypes.find(ft => ft.type === e.target.value)
                    setNewFeed({...newFeed, type: t.type, label: t.label})
                  }}>
                  {feedTypes.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--on-surface-variant)', fontWeight: 600 }}>Display Name</label>
                <input type="text" className="form-input"
                  placeholder="e.g. AI News Feed"
                  value={newFeed.name} onChange={e => setNewFeed({...newFeed, name: e.target.value})} />
              </div>
            </div>
            
            {(newFeed.type === 'news' || newFeed.type === 'web') && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--on-surface-variant)', fontWeight: 600 }}>Search Query</label>
                <input type="text" className="form-input"
                  placeholder="Enter keyword to monitor..."
                  value={newFeed.query} onChange={e => setNewFeed({...newFeed, query: e.target.value})} />
              </div>
            )}
            
            {['rss', 'websocket', 'api_poll'].includes(newFeed.type) && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                  {newFeed.type === 'websocket' ? 'WebSocket URL' : newFeed.type === 'api_poll' ? 'API Endpoint' : 'RSS/Atom URL'}
                </label>
                <input type="text" className="form-input"
                  placeholder={newFeed.type === 'websocket' ? 'wss://...' : 'https://...'}
                  value={newFeed.url} onChange={e => setNewFeed({...newFeed, url: e.target.value})} />
              </div>
            )}
            
            <button className="btn btn-primary btn-sm" onClick={handleAddFeed}>Save Source</button>
          </div>
        )}

        {feeds.length === 0 && !showAddFeed ? (
          <div className="empty-state" style={{ padding: '32px' }}>
            <div className="empty-icon"><Rss size={48} /></div>
            <p className="empty-text">No live data sources configured. Agents will rely solely on static seeds and the LLM's internal knowledge.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {feeds.map(f => {
              const fType = feedTypes.find(t => t.type === f.type)
              const Icon = feedIcons[f.type] || Rss
              return (
                <div key={f.id} className="flex items-center justify-between"
                  style={{ padding: '12px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                      <Icon size={16} style={{ color: 'var(--primary)' }} /> {f.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--on-surface-variant-muted)', marginTop: '4px' }}>
                      {['rss', 'websocket', 'api_poll'].includes(f.type) ? f.url : `Query: "${f.query}"`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleTestFeed(f)} disabled={testingFeed}>
                      <TestTube size={14} /> Test
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleRemoveFeed(f.id)}>
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Launch Options */}
      <h2 style={{ fontSize: '16px', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '16px' }}>Start a Run</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px', marginBottom: '32px' }}>
        
        {/* Launch Simulation Card */}
        <div 
          className="card" 
          style={{ cursor: 'pointer', padding: '32px 24px' }}
          onClick={() => navigate(`/workspace/${wsId}/project/${projId}/run/new`)}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && navigate(`/workspace/${wsId}/project/${projId}/run/new`)}
        >
          <div style={{ marginBottom: '16px', color: 'var(--primary)' }}><Rocket size={40} /></div>
          <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '8px' }}>Multi-Agent Simulation</h3>
          <p style={{ fontSize: '13px', color: 'var(--on-surface-variant-muted)', lineHeight: '1.6' }}>
            Run a multi-agent debate based on your seed materials and configured live data streams.
          </p>
        </div>

        {/* Launch Auto-Researcher Card */}
        <div 
          className="card" 
          style={{ cursor: 'pointer', padding: '32px 24px', borderColor: 'var(--primary)' }}
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
        >
          <div style={{ marginBottom: '16px', color: 'var(--primary)' }}><Bot size={40} /></div>
          <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '8px' }}>Auto-Researcher</h3>
          <p style={{ fontSize: '13px', color: 'var(--on-surface-variant-muted)', lineHeight: '1.6' }}>
            Deploy an autonomous agent that gathers data and spawns internal debates to peer-review its findings.
          </p>
        </div>
        
      </div>

      {runs.filter(r => r.status === 'completed').length >= 2 && (
        <div className="flex justify-end mb-4">
          <button className="btn btn-secondary"
            onClick={() => navigate(`/workspace/${wsId}/project/${projId}/compare`)}>
            <Scale size={16} /> Compare Runs
          </button>
        </div>
      )}

      {/* Auto-Research Jobs */}
      {arJobs.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bot size={18} /> Auto-Researcher Jobs</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Topic</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Actions</th>
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
                        {j.status === 'running' ? 'Monitor' : 'View'} <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
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
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Microscope size={18} /> Run History</div>
        </div>
        {runs.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px' }}>
            <div className="empty-icon"><FlaskConical size={48} /></div>
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
                          Monitor <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                      ) : r.status === 'completed' ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/run/${r.id}/results`)}>
                          Results <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/run/${r.id}`)}>
                          View <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
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
