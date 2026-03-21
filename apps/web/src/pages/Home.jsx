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
    const ws = await createWorkspace(wsName.trim())
    setWsName('')
    setShowNew(false)
    load()
  }

  async function handleCreateProject(e) {
    e.preventDefault()
    if (!projName.trim()) return
    const proj = await createProject(showProject, projName.trim(), projQuestion.trim())
    setProjName('')
    setProjQuestion('')
    setShowProject(null)
    navigate(`/workspace/${showProject}/project/${proj.id}`)
  }

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Research Projects</h1>
          <p className="page-subtitle">Create, explore, and improve your research with simulated scenarios</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ New Workspace</button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 mt-6"><div className="spinner" /> Loading...</div>
      ) : workspaces.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔬</div>
          <h3 className="empty-title">No workspaces yet</h3>
          <p className="empty-text">Create your first workspace to start organizing research projects, uploading seed materials, and running simulations.</p>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>Create Workspace</button>
        </div>
      ) : (
        <div className="card-grid">
          {workspaces.map(ws => (
            <div key={ws.id} className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">📁 {ws.name}</div>
                  <div className="card-subtitle">{ws.created_at?.slice(0, 10)}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowProject(ws.id)}>
                  + New Project
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/workspace/${ws.id}/project/list`)}>
                  View Projects →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleCreateWs}>
            <h2 className="modal-title">Create Workspace</h2>
            <div className="form-group">
              <label className="form-label">Workspace Name</label>
              <input className="form-input" value={wsName} onChange={e => setWsName(e.target.value)}
                placeholder="e.g. Q1 Strategy Research" autoFocus />
            </div>
            <div className="flex gap-2 justify-between">
              <button type="button" className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}

      {showProject && (
        <div className="modal-overlay" onClick={() => setShowProject(null)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleCreateProject}>
            <h2 className="modal-title">New Research Project</h2>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input className="form-input" value={projName} onChange={e => setProjName(e.target.value)}
                placeholder="e.g. Go-to-Market Analysis" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Research Question</label>
              <textarea className="form-textarea" value={projQuestion} onChange={e => setProjQuestion(e.target.value)}
                placeholder="What research question do you want to explore?" />
            </div>
            <div className="flex gap-2 justify-between">
              <button type="button" className="btn btn-secondary" onClick={() => setShowProject(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Project</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
