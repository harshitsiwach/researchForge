import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { listRuns, compareRuns, promoteConfig } from '../api'

function ScoreBar({ label, value, delta }) {
  return (
    <div className="score-bar-wrap">
      <span className="score-label">{label}</span>
      <div className="score-bar">
        <div className="score-fill" style={{ width: `${(value / 10) * 100}%` }} />
      </div>
      <span className="score-value">{value.toFixed(1)}</span>
      {delta !== undefined && (
        <span style={{
          fontSize: 12, fontWeight: 600, minWidth: 42,
          color: delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--error)' : 'var(--text-muted)'
        }}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}
        </span>
      )}
    </div>
  )
}

export default function Compare() {
  const { wsId, projId } = useParams()
  const navigate = useNavigate()
  const [runs, setRuns] = useState([])
  const [baselineId, setBaselineId] = useState('')
  const [challengerId, setChallengerId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [promoting, setPromoting] = useState(false)

  useEffect(() => {
    listRuns(projId).then(data => {
      const completed = data.filter(r => r.status === 'completed')
      setRuns(completed)
      if (completed.length >= 2) {
        setBaselineId(completed[1]?.id || '')
        setChallengerId(completed[0]?.id || '')
      }
    })
  }, [projId])

  async function handleCompare() {
    if (!baselineId || !challengerId) return
    setLoading(true)
    try {
      const res = await compareRuns(projId, baselineId, challengerId)
      setResult(res)
    } catch (e) {
      alert('Compare failed: ' + e.message)
    }
    setLoading(false)
  }

  async function handlePromote(runId) {
    setPromoting(true)
    try {
      await promoteConfig(projId, runId)
      alert('Config promoted to new baseline!')
    } catch (e) {
      alert('Promote failed: ' + e.message)
    }
    setPromoting(false)
  }

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-ghost btn-sm mb-2"
          onClick={() => navigate(`/workspace/${wsId}/project/${projId}`)}>← Back to Project</button>
        <h1 className="page-title">Compare Runs</h1>
        <p className="page-subtitle">Select a baseline and a challenger run to compare research quality</p>
      </div>

      {/* Selectors */}
      <div className="card mb-4">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Baseline Run</label>
            <select className="form-select" value={baselineId} onChange={e => setBaselineId(e.target.value)}>
              <option value="">Select...</option>
              {runs.map(r => <option key={r.id} value={r.id}>{r.id} ({r.mode})</option>)}
            </select>
          </div>
          <div className="compare-vs">vs</div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Challenger Run</label>
            <select className="form-select" value={challengerId} onChange={e => setChallengerId(e.target.value)}>
              <option value="">Select...</option>
              {runs.map(r => <option key={r.id} value={r.id}>{r.id} ({r.mode})</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary mt-4" onClick={handleCompare}
          disabled={loading || !baselineId || !challengerId}>
          {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Evaluating...</> : '⚖️ Compare Now'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Winner banner */}
          <div className="card mb-4" style={{
            borderColor: result.winner === 'challenger' ? 'var(--success)' :
              result.winner === 'baseline' ? 'var(--accent)' : 'var(--warning)',
            textAlign: 'center', padding: '24px'
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>
              {result.winner === 'challenger' ? '🏆' : result.winner === 'baseline' ? '🛡️' : '🤝'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {result.winner === 'challenger' ? 'Challenger wins!' :
               result.winner === 'baseline' ? 'Baseline holds!' : 'It\'s a tie'}
            </div>
            <p className="text-sm text-muted mt-2">{result.recommendation}</p>
            {result.winner === 'challenger' && (
              <button className="btn btn-success mt-4" onClick={() => handlePromote(challengerId)}
                disabled={promoting}>
                {promoting ? 'Promoting...' : '↑ Promote Challenger to Baseline'}
              </button>
            )}
          </div>

          {/* Side by side */}
          <div className="compare-grid">
            <div className={`compare-panel ${result.winner === 'baseline' ? 'winner' : ''}`}>
              <div className="card-title mb-4">🛡️ Baseline</div>
              <div className="text-sm font-mono text-muted mb-4">{result.baseline_run_id}</div>
              {result.baseline_score && Object.entries(result.baseline_score).map(([k, v]) => (
                <ScoreBar key={k} label={k} value={v} />
              ))}
              <div className="mt-4" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-accent)' }}>
                Composite: {(Object.values(result.baseline_score || {}).reduce((a, b) => a + b, 0) / 6).toFixed(1)}
              </div>
            </div>
            <div className={`compare-panel ${result.winner === 'challenger' ? 'winner' : ''}`}>
              <div className="card-title mb-4">⚔️ Challenger</div>
              <div className="text-sm font-mono text-muted mb-4">{result.challenger_run_id}</div>
              {result.challenger_score && Object.entries(result.challenger_score).map(([k, v]) => (
                <ScoreBar key={k} label={k} value={v}
                  delta={result.delta?.[k]} />
              ))}
              <div className="mt-4" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-accent)' }}>
                Composite: {(Object.values(result.challenger_score || {}).reduce((a, b) => a + b, 0) / 6).toFixed(1)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
