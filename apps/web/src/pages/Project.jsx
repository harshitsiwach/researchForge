import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, uploadSeed, listSeeds, generateSeed, listRuns } from '../api'

export default function Project() {
  const { wsId, projId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [seeds, setSeeds] = useState([])
  const [runs, setRuns] = useState([])
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const fileRef = useRef()

  useEffect(() => { load() }, [projId])

  async function load() {
    try {
      const p = await getProject(wsId, projId)
      setProject(p)
      setSeeds(p.seeds || [])
      setRuns(p.runs || [])
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
