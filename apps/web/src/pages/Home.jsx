import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { listWorkspaces, createWorkspace, createProject, listRuns } from '../api'
import { toast } from '../components/Toast'

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
      toast.success('Workspace created successfully')
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
      toast.success('Project deployed successfully')
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
          <div style={{ color: 'var(--text-neon)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '8px' }}>
            RESEARCH CLUSTER // DASHBOARD
          </div>
          <h1 className="page-title">Laboratory Overview</h1>
          <p className="page-subtitle">Orchestrate simulations and analyze emergent agent behaviors across your workspaces.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowNew(true); setTimeout(() => openModal(modalRef), 100) }}>
          <span style={{ fontSize: '18px' }}>+</span> New Research Unit
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-4 mt-12">
          <div className="spinner" style={{ width: 24, height: 24 }} />
          <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>INITIALIZING DATA CLUSTER...</span>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="empty-state animate-in">
          <div className="empty-icon" style={{ opacity: 0.8, filter: 'drop-shadow(0 0 10px var(--accent-indigo))' }}>🧪</div>
          <h2 className="empty-title" style={{ fontSize: '24px', color: '#fff' }}>No Active Units Found</h2>
          <p className="empty-text">Initialize your first research workspace to begin generating scenarios and monitoring agent interactions.</p>
          <button className="btn btn-primary" onClick={() => { setShowNew(true); setTimeout(() => openModal(modalRef), 100) }} style={{ marginTop: '32px' }}>
            Initialize Workspace
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {workspaces.map((ws, i) => (
            <div key={ws.id} className="card animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent)', pointerEvents: 'none' }}></div>
              
              <div className="card-header">
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-neon)', fontWeight: 700, marginBottom: '4px' }}>UNIT ID: {ws.id.slice(0, 8).toUpperCase()}</div>
                  <div className="card-title" style={{ fontSize: '20px' }}>{ws.name}</div>
                  <div className="card-subtitle" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', opacity: 0.6 }}>
                    CREATED_STAMP: {ws.created_at?.slice(0, 10)}
                  </div>
                </div>
              </div>

              <div style={{ margin: '20px 0', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>NEURAL LOAD</span>
                  <span>42%</span>
                </div>
                <div className="score-bar" style={{ height: '4px' }}>
                  <div className="score-fill" style={{ width: '42%' }}></div>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setShowProject(ws.id)}>
                  + New Project
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/workspace/${ws.id}/project/list`)} style={{ border: '1px solid var(--border)' }}>
                  Enter Hub →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {recentRuns.length > 0 && (
        <div className="card mt-6 animate-in" style={{ animationDelay: '0.3s' }}>
          <div className="card-header">
            <div className="card-title">🕐 Recent Runs</div>
          </div>
          <div className="flex flex-col gap-2">
            {recentRuns.map(run => (
              <div key={run.id} className="flex items-center justify-between"
                style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => navigate(run.status === 'completed' ? `/run/${run.id}/results` : `/run/${run.id}`)}
                role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && navigate(run.status === 'completed' ? `/run/${run.id}/results` : `/run/${run.id}`)}>
                <div>
                  <span className="font-mono text-sm">{run.id.slice(0, 16)}</span>
                  <span className="text-sm text-muted" style={{ marginLeft: '12px' }}>{run.workspaceName} / {run.projectName}</span>
                </div>
                <span className={`badge badge-${run.status}`}>
                  <span className="badge-dot" />
                  {run.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {promotedConfig && (
        <div className="card mt-4 animate-in" style={{ animationDelay: '0.4s', borderColor: 'var(--success)' }}>
          <div className="card-header">
            <div className="card-title" style={{ color: 'var(--success)' }}>🛡️ Promoted Baseline</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="stat-box" style={{ minWidth: '120px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{promotedConfig.label}</div>
              <div className="text-sm text-muted">{promotedConfig.projectName}</div>
            </div>
            <div className="text-sm text-muted">
              Agents: {promotedConfig.config_json?.num_agents || '—'} · Rounds: {promotedConfig.config_json?.num_rounds || '—'} · Style: {promotedConfig.config_json?.debate_style || '—'}
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleCreateWs} role="dialog" aria-modal="true" aria-label="Create Research Unit" ref={modalRef} tabIndex={-1}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ color: 'var(--text-neon)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '4px' }}>CMD: INITIALIZE_UNIT</div>
              <h2 className="modal-title" style={{ marginBottom: 0 }}>Create Research Unit</h2>
            </div>
            
            <div className="form-group">
              <label className="form-label">Cluster Designation</label>
              <input className="form-input" value={wsName} onChange={e => setWsName(e.target.value)}
                placeholder="e.g. ALPHA-STRATEGY-2025" autoFocus />
            </div>
            
            <div className="flex gap-3 mt-8">
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowNew(false)}>Abort</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Initialize Unit</button>
            </div>
          </form>
        </div>
      )}

      {showProject && (
        <div className="modal-overlay" onClick={() => setShowProject(null)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleCreateProject} role="dialog" aria-modal="true" aria-label="New Subject Analysis" ref={projectModalRef} tabIndex={-1}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ color: 'var(--text-neon)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '4px' }}>CMD: DEPLOY_PROJECT</div>
              <h2 className="modal-title" style={{ marginBottom: 0 }}>New Subject Analysis</h2>
            </div>
            
            <div className="form-group">
              <label className="form-label">Analysis ID</label>
              <input className="form-input" value={projName} onChange={e => setProjName(e.target.value)}
                placeholder="e.g. MARKET_SENTIMENT_SCAN" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Research Hypothesis</label>
              <textarea className="form-textarea" value={projQuestion} onChange={e => setProjQuestion(e.target.value)}
                placeholder="DEFINE_QUESTION_HERE..." />
            </div>
            <div className="flex gap-3 mt-8">
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowProject(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Deploy Project</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
