import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { listWorkspaces, createWorkspace, createProject } from '../api'
import { toast } from '../components/Toast'
import { Plus, Clock, ShieldCheck, FlaskConical, ArrowRight, ArrowUpRight } from 'lucide-react'

export default function Home() {
  const [workspaces, setWorkspaces] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [wsName, setWsName] = useState('')
  const [showProject, setShowProject] = useState(null)
  const [projName, setProjName] = useState('')
  const [projQuestion, setProjQuestion] = useState('')
  const [loading, setLoading] = useState(true)
  const [recentRuns, setRecentRuns] = useState([])
  const [promotedConfig, setPromotedConfig] = useState(null)
  const modalRef = useRef(null)
  const projectModalRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') {
        if (showProject) setShowProject(null)
        else if (showNew) setShowNew(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showNew, showProject])

  async function load() {
    try {
      const data = await listWorkspaces()
      setWorkspaces(data)
      const allRuns = []
      for (const ws of data) {
        try {
          const wsData = await fetch(`/api/workspaces/${ws.id}`).then(r => r.json())
          if (wsData.projects) {
            for (const proj of wsData.projects) {
              if (proj.runs) {
                proj.runs.forEach(r => allRuns.push({ ...r, workspaceName: ws.name, projectName: proj.name }))
              }
              if (proj.configs) {
                const baseline = proj.configs.find(c => c.is_baseline)
                if (baseline) setPromotedConfig({ ...baseline, projectName: proj.name, workspaceName: ws.name })
              }
            }
          }
        } catch {}
      }
      allRuns.sort((a, b) => (b.started_at || '').localeCompare(a.started_at || ''))
      setRecentRuns(allRuns.slice(0, 3))
    } catch (e) {
      console.error(e)
      toast.error('Failed to load workspaces')
    }
    setLoading(false)
  }

  async function handleCreateWs(e) {
    e.preventDefault()
    if (!wsName.trim()) return
    try {
      await createWorkspace(wsName.trim())
      setWsName('')
      setShowNew(false)
      load()
      toast.success('Workspace created')
    } catch (e) {
      toast.error(e.message || 'Failed to create workspace')
    }
  }

  async function handleCreateProject(e) {
    e.preventDefault()
    if (!projName.trim()) return
    try {
      const proj = await createProject(showProject, projName.trim(), projQuestion.trim())
      setProjName('')
      setProjQuestion('')
      setShowProject(null)
      toast.success('Project created')
      navigate(`/workspace/${showProject}/project/${proj.id}`)
    } catch (e) {
      toast.error(e.message || 'Failed to create project')
    }
  }

  function openModal(ref) {
    ref.current?.focus()
  }

  return (
    <div className="animate-in">
      <div className="page-header flex justify-between items-end">
        <div>
          <div className="page-tag">SYSTEM_OPERATIVE_DASHBOARD</div>
          <h1 className="page-title">Research <span style={{ color: 'var(--primary)' }}>Workspaces</span></h1>
        </div>
        <button className="btn btn-primary manga-border" onClick={() => { setShowNew(true); setTimeout(() => openModal(modalRef), 100) }}>
          NEW_WORKSPACE <Plus size={16} />
        </button>
      </div>

      {/* Ink Divider */}
      <div className="ink-divider">
        <div className="slash diagonal-slash" style={{ width: '33%', left: '12%', background: 'var(--secondary-container)' }}></div>
        <div className="slash diagonal-slash" style={{ width: '25%', left: '35%', background: 'var(--primary)', opacity: 0.5 }}></div>
        <div className="line"></div>
        <div className="label">SEC_STATUS: CLEAR</div>
      </div>

      {loading ? (
        <div className="flex items-center gap-4 mt-12">
          <div className="spinner" style={{ width: 24, height: 24 }} />
          <span style={{ color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em' }}>INITIALIZING_DATA_CLUSTER...</span>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="empty-state animate-in">
          <div className="empty-icon"><FlaskConical size={48} /></div>
          <h2 className="empty-title">No Active Nodes</h2>
          <p className="empty-text">Initialize your first research workspace to begin generating scenarios and monitoring agent interactions.</p>
          <button className="btn btn-primary manga-border" onClick={() => { setShowNew(true); setTimeout(() => openModal(modalRef), 100) }} style={{ marginTop: '24px' }}>
            INITIALIZE WORKSPACE
          </button>
        </div>
      ) : (
        <div className="bento-grid">
          {workspaces.map((ws, i) => (
            <div key={ws.id} className="bento-col-8 card animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="absolute top-0 right-0 p-4 text-outline-variant screentone-dots w-32 h-32 opacity-20 pointer-events-none" style={{ width: 128, height: 128 }}></div>
              
              <div className="flex justify-between items-start mb-12 relative z-10">
                <div>
                  <span className="badge" style={{ background: 'var(--secondary-container)', color: 'var(--ink-black)', marginBottom: 12, display: 'inline-block' }}>ACTIVE_NODE</span>
                  <h2 className="card-title" style={{ fontSize: 28, fontFamily: 'var(--font-headline)', fontWeight: 900, textTransform: 'uppercase' }}>{ws.name}</h2>
                  <p className="text-sm text-muted" style={{ maxWidth: 400, marginTop: 8 }}>Isolated environment for rapid agent prototyping and algorithmic performance testing.</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted" style={{ fontSize: 10, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CREATED</div>
                  <div style={{ fontSize: 18, fontFamily: 'var(--font-headline)', fontWeight: 700, color: 'var(--secondary)' }}>{ws.created_at?.slice(0, 10)}</div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div className="flex justify-between text-sm" style={{ fontFamily: 'var(--font-label)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                  <span>Resource Consumption</span>
                  <span style={{ color: 'var(--primary)' }}>42% / 100%</span>
                </div>
                <div style={{ height: 20, background: 'var(--ink-black)', border: '2px solid var(--outline-variant)', display: 'flex', padding: 2, gap: 2 }}>
                  <div style={{ height: '100%', background: 'var(--primary)', width: '42%', boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)' }}></div>
                  {[...Array(5)].map((_, j) => (
                    <div key={j} style={{ height: '100%', borderRight: '2px solid var(--surface)', width: '11.6%', opacity: 0.2 }}></div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button className="btn btn-secondary" onClick={() => setShowProject(ws.id)}>
                  OPEN WORKSPACE <ArrowRight size={14} />
                </button>
                <button className="btn btn-ghost" onClick={() => navigate(`/workspace/${ws.id}/project/list`)}>
                  + NEW PROJECT
                </button>
              </div>
            </div>
          ))}

          {/* Sidebar Stats */}
          <div className="bento-col-4 flex flex-col gap-6">
            <div className="card" style={{ background: 'var(--surface-container-high)' }}>
              <div className="flex items-center gap-2 mb-6">
                <Clock size={18} style={{ color: 'var(--primary)' }} />
                <h3 className="card-title">Recent Activity</h3>
              </div>
              {recentRuns.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {recentRuns.map(run => (
                    <div key={run.id} className="flex items-center justify-between"
                      style={{ padding: '10px 12px', background: 'var(--surface)', borderLeft: '4px solid var(--primary)', cursor: 'pointer' }}
                      onClick={() => navigate(run.status === 'completed' ? `/run/${run.id}/results` : `/run/${run.id}`)}
                      role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && navigate(run.status === 'completed' ? `/run/${run.id}/results` : `/run/${run.id}`)}>
                      <div>
                        <div className="text-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{run.id.slice(0, 12)}</div>
                        <div className="text-sm text-muted" style={{ fontSize: 10 }}>{run.workspaceName}</div>
                      </div>
                      <span className={`badge badge-${run.status}`}><span className="badge-dot" />{run.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted" style={{ fontFamily: 'var(--font-label)', fontSize: 11 }}>NO_RECENT_ACTIVITY</div>
              )}
            </div>

            {promotedConfig && (
              <div className="card" style={{ background: 'var(--ink-black)', border: '4px solid var(--secondary-container)' }}>
                <h3 className="card-title" style={{ color: 'var(--secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={16} /> BASELINE_CONFIG
                </h3>
                <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{promotedConfig.label}</div>
                <div className="text-sm text-muted" style={{ fontSize: 11, fontFamily: 'var(--font-label)' }}>{promotedConfig.projectName}</div>
                <div className="text-sm text-muted" style={{ fontSize: 10, fontFamily: 'var(--font-mono)', marginTop: 8 }}>
                  AGENTS: {promotedConfig.config_json?.num_agents || '—'} · ROUNDS: {promotedConfig.config_json?.num_rounds || '—'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleCreateWs} role="dialog" aria-modal="true" aria-label="Create Workspace" ref={modalRef} tabIndex={-1}>
            <h2 className="modal-title">Create Workspace</h2>
            <div className="form-group">
              <label className="form-label">Workspace Name</label>
              <input className="form-input" value={wsName} onChange={e => setWsName(e.target.value)}
                placeholder="e.g. Market Research 2025" autoFocus />
            </div>
            <div className="flex gap-3 mt-8">
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowNew(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary manga-border" style={{ flex: 2 }}>Create</button>
            </div>
          </form>
        </div>
      )}

      {showProject && (
        <div className="modal-overlay" onClick={() => setShowProject(null)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleCreateProject} role="dialog" aria-modal="true" aria-label="New Project" ref={projectModalRef} tabIndex={-1}>
            <h2 className="modal-title">New Project</h2>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input className="form-input" value={projName} onChange={e => setProjName(e.target.value)}
                placeholder="e.g. Market Sentiment Analysis" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Research Question</label>
              <textarea className="form-textarea" value={projQuestion} onChange={e => setProjQuestion(e.target.value)}
                placeholder="What question are you trying to answer?" />
            </div>
            <div className="flex gap-3 mt-8">
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowProject(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary manga-border" style={{ flex: 2 }}>Create Project</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
