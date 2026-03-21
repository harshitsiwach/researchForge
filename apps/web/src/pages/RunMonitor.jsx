import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRun } from '../api'

export default function RunMonitor() {
  const { runId } = useParams()
  const navigate = useNavigate()
  const [run, setRun] = useState(null)

  useEffect(() => {
    loadRun()
    const interval = setInterval(loadRun, 2000)
    return () => clearInterval(interval)
  }, [runId])

  async function loadRun() {
    try {
      const r = await getRun(runId)
      setRun(r)
      if (r.status === 'completed' || r.status === 'failed') {
        // Stop polling
      }
    } catch (e) {
      console.error(e)
    }
  }

  if (!run) return <div className="flex items-center gap-3"><div className="spinner" /> Loading run...</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Run Monitor</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className={`badge badge-${run.status}`}>
            <span className="badge-dot" />
            {run.status}
          </span>
          <span className="text-sm text-muted font-mono">{run.id}</span>
        </div>
      </div>

      {/* Status card */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="card-title">Run Details</div>
          {run.status === 'completed' && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/run/${runId}/results`)}>
              View Results →
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div>
            <div className="text-sm text-muted">Mode</div>
            <div className="mt-2 font-mono">{run.mode}</div>
          </div>
          <div>
            <div className="text-sm text-muted">Started</div>
            <div className="mt-2 text-sm">{run.started_at?.slice(0, 19)}</div>
          </div>
          <div>
            <div className="text-sm text-muted">Finished</div>
            <div className="mt-2 text-sm">{run.finished_at?.slice(0, 19) || '—'}</div>
          </div>
          <div>
            <div className="text-sm text-muted">Config ID</div>
            <div className="mt-2 font-mono text-sm truncate">{run.config_id}</div>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Logs</div>
          {run.status === 'running' && <div className="spinner" />}
        </div>
        <div className="log-viewer">
          {run.log ? (
            run.log.split('\n').map((line, i) => (
              <div key={i} className="log-line">{line}</div>
            ))
          ) : (
            <div className="text-muted">Waiting for logs...</div>
          )}
        </div>
      </div>

      {run.error && (
        <div className="card mt-4" style={{ borderColor: 'var(--error)' }}>
          <div className="card-title text-error">Error</div>
          <pre className="text-sm mt-2" style={{ color: 'var(--error)', whiteSpace: 'pre-wrap' }}>{run.error}</pre>
        </div>
      )}
    </div>
  )
}
