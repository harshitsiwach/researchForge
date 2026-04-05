import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { listRuns, compareRuns, promoteConfig } from '../api'
import { toast } from '../components/Toast'
import PageLoading from '../components/PageLoading'
import { Scale, Trophy, Shield, Handshake, ArrowLeft, ArrowUp } from 'lucide-react'

function SegmentedScoreBar({ label, value, delta }) {
  const segments = 10
  const filled = Math.round((value / 10) * segments)
  return (
    <div className="score-bar-wrap">
      <span className="score-label">{label}</span>
      <div className="score-bar">
        {[...Array(segments)].map((_, i) => (
          <div key={i} className={`score-segment ${i < filled ? (value >= 7 ? 'filled-high' : 'filled') : ''}`} />
        ))}
      </div>
      <span className="score-value">{value.toFixed(1)}</span>
      {delta !== undefined && (
        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 42, color: delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--error)' : 'var(--on-surface-variant)', fontFamily: 'var(--font-label)' }}>
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
  const [loadingRuns, setLoadingRuns] = useState(true)

  useEffect(() => {
    listRuns(projId)
      .then(data => {
        const completed = data.filter(r => r.status === 'completed')
        setRuns(completed)
        if (completed.length >= 2) { setBaselineId(completed[1]?.id || ''); setChallengerId(completed[0]?.id || '') }
      })
      .catch(e => { console.error(e); toast.error('Failed to load runs') })
      .finally(() => setLoadingRuns(false))
  }, [projId])

  async function handleCompare() {
    if (!baselineId || !challengerId) return toast.warning('Select both baseline and challenger runs')
    if (baselineId === challengerId) return toast.warning('Baseline and challenger must be different runs')
    setLoading(true)
    try { const res = await compareRuns(projId, baselineId, challengerId); setResult(res); toast.success('Comparison complete') }
    catch (e) { toast.error('Compare failed: ' + e.message) }
    setLoading(false)
  }

  async function handlePromote(runId) {
    setPromoting(true)
    try { await promoteConfig(projId, runId); toast.success('Config promoted to new baseline') }
    catch (e) { toast.error('Promote failed: ' + e.message) }
    setPromoting(false)
  }

  if (loadingRuns) return <PageLoading message="LOADING_RUN_DATA..." />

  if (runs.length < 2) {
    return (
      <div className="animate-in">
        <div className="page-header">
          <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate(`/workspace/${wsId}/project/${projId}`)}><ArrowLeft size={16} /> Back to Project</button>
          <h1 className="page-title">Compare Runs</h1>
          <p className="page-subtitle">Select a baseline and a challenger run to compare research quality</p>
        </div>
        <div className="empty-state animate-in">
          <div className="empty-icon"><Scale size={48} /></div>
          <h2 className="empty-title">Not Enough Data</h2>
          <p className="empty-text">You need at least 2 completed runs to perform a comparison. Launch more simulation runs and come back once they finish.</p>
          <button className="btn btn-primary manga-border" onClick={() => navigate(`/workspace/${wsId}/project/${projId}/run/new`)} style={{ marginTop: '24px' }}>Launch New Run</button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate(`/workspace/${wsId}/project/${projId}`)}><ArrowLeft size={16} /> Back to Project</button>
        <h1 className="page-title">Compare Runs</h1>
        <p className="page-subtitle">Select a baseline and a challenger run to compare research quality</p>
      </div>

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
        <button className="btn btn-primary manga-border mt-4" onClick={handleCompare} disabled={loading || !baselineId || !challengerId}>
          {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Evaluating...</> : <><Scale size={16} /> Compare</>}
        </button>
      </div>

      {result && (
        <>
          <div className="card mb-4" style={{ borderColor: result.winner === 'challenger' ? 'var(--secondary-container)' : result.winner === 'baseline' ? 'var(--primary)' : 'var(--warning)', textAlign: 'center', padding: '24px', borderTop: `4px solid ${result.winner === 'challenger' ? 'var(--secondary-container)' : result.winner === 'baseline' ? 'var(--primary)' : 'var(--warning)'}` }}>
            <div style={{ marginBottom: 8, color: result.winner === 'challenger' ? 'var(--secondary)' : result.winner === 'baseline' ? 'var(--primary)' : 'var(--warning)' }}>
              {result.winner === 'challenger' ? <Trophy size={32} /> : result.winner === 'baseline' ? <Shield size={32} /> : <Handshake size={32} />}
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'var(--font-headline)', textTransform: 'uppercase' }}>
              {result.winner === 'challenger' ? 'Challenger Wins!' : result.winner === 'baseline' ? 'Baseline Holds!' : "It's a Tie"}
            </div>
            <p className="text-sm text-muted mt-2">{result.recommendation}</p>
            {result.winner === 'challenger' && (
              <button className="btn btn-success manga-border mt-4" onClick={() => handlePromote(challengerId)} disabled={promoting}>
                <ArrowUp size={16} /> {promoting ? 'Promoting...' : 'Promote to Baseline'}
              </button>
            )}
          </div>

          <div className="compare-grid">
            <div className={`compare-panel ${result.winner === 'baseline' ? 'winner' : ''}`}>
              <div className="card-title mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={18} /> Baseline</div>
              <div className="text-sm font-mono text-muted mb-4">{result.baseline_run_id}</div>
              {result.baseline_score && Object.entries(result.baseline_score).map(([k, v]) => (<SegmentedScoreBar key={k} label={k} value={v} />))}
              <div className="mt-4" style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-headline)' }}>
                Composite: {(Object.values(result.baseline_score || {}).reduce((a, b) => a + b, 0) / 6).toFixed(1)}
              </div>
            </div>
            <div className={`compare-panel ${result.winner === 'challenger' ? 'winner' : ''}`}>
              <div className="card-title mb-4">Challenger</div>
              <div className="text-sm font-mono text-muted mb-4">{result.challenger_run_id}</div>
              {result.challenger_score && Object.entries(result.challenger_score).map(([k, v]) => (<SegmentedScoreBar key={k} label={k} value={v} delta={result.delta?.[k]} />))}
              <div className="mt-4" style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-headline)' }}>
                Composite: {(Object.values(result.challenger_score || {}).reduce((a, b) => a + b, 0) / 6).toFixed(1)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
