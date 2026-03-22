import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listWorkspaces, createWorkspace, createProject } from '../api'

export default function Home() {
  const [workspaces, setWorkspaces] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [wsName, setWsName] = useState('')
  const [showProject, setShowProject] = useState(null)
  const [projName, setProjName] = useState('')
  const [projQuestion, setProjQuestion] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const data = await listWorkspaces()
      setWorkspaces(data)
    } catch (e) {
      console.error(e)
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
    } catch (e) {
      console.error(e)
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
      navigate(`/workspace/${showProject}/project/${proj.id}`)
    } catch (e) {
      console.error(e)
    }
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
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
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
          <button className="btn btn-primary btn-lg" onClick={() => setShowNew(true)} style={{ marginTop: '32px' }}>
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

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleCreateWs}>
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
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleCreateProject}>
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
