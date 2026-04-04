import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getReport } from '../api'
import { toast } from '../components/Toast'

function ScoreBar({ label, value, icon }) {
  const getColor = (v) => {
    if (v >= 80) return '#34d399'
    if (v >= 60) return '#818cf8'
    if (v >= 40) return '#fbbf24'
    return '#f87171'
  }
  return (
    <div className="score-bar-wrap">
      <span className="score-label">{icon} {label}</span>
      <div className="score-bar">
        <div className="score-fill" style={{
          width: `${value}%`,
          background: `linear-gradient(90deg, ${getColor(value)}88, ${getColor(value)})`,
        }} />
      </div>
      <span className="score-value" style={{ color: getColor(value) }}>{value.toFixed(1)}</span>
    </div>
  )
}

function ScenarioCard({ scenario, index, id }) {
  const [expanded, setExpanded] = useState(false)
  const probNum = typeof scenario.probability_percentage === 'number' 
    ? scenario.probability_percentage 
    : parseInt(scenario.probability_percentage) || parseInt(scenario.probability_assessment) || 50

  let prob
  if (probNum >= 70) prob = { bg: 'rgba(52,211,153,0.12)', color: '#34d399', icon: '🟢' }
  else if (probNum >= 30) prob = { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', icon: '🟡' }
  else prob = { bg: 'rgba(248,113,113,0.12)', color: '#f87171', icon: '🔴' }

  return (
    <div className="card" style={{ border: '1px solid var(--border)', cursor: 'pointer' }}
      onClick={() => setExpanded(!expanded)}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && setExpanded(!expanded)}
      aria-expanded={expanded}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
            background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white',
          }}>
            S{index + 1}
          </div>
          <div>
            <div className="card-title" style={{ fontSize: 15 }}>{scenario.title || `Scenario ${index + 1}`}</div>
            {(scenario.probability_percentage !== undefined || scenario.probability_assessment) && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 12,
                background: prob.bg, color: prob.color, fontWeight: 600,
              }}>
                {prob.icon} {scenario.probability_percentage !== undefined ? `${probNum}%` : scenario.probability_assessment} probability
              </span>
            )}
          </div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', transition: 'transform 200ms' ,
          transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</span>
      </div>

      <p className="text-sm text-muted" style={{ marginTop: 12, lineHeight: 1.7 }}>
        {expanded ? scenario.description : scenario.description?.slice(0, 180) + (scenario.description?.length > 180 ? '...' : '')}
      </p>

      {expanded && (
        <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          {scenario.key_drivers?.length > 0 && (
            <div>
              <div className="text-sm" style={{ fontWeight: 600, color: 'var(--text-accent)', marginBottom: 6 }}>🔑 Key Drivers</div>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {scenario.key_drivers.map((d, i) => (
                  <span key={d || i} style={{
                    padding: '4px 10px', borderRadius: 16, fontSize: 12,
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                    color: 'var(--text-secondary)',
                  }}>{d}</span>
                ))}
              </div>
            </div>
          )}
          {scenario.risks?.length > 0 && (
            <div>
              <div className="text-sm" style={{ fontWeight: 600, color: 'var(--error)', marginBottom: 6 }}>⚠️ Risks</div>
              <ul style={{ paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
                {scenario.risks.map((r, i) => <li key={r || i} style={{ marginBottom: 4 }}>{r}</li>)}
              </ul>
            </div>
          )}
          {scenario.opportunities?.length > 0 && (
            <div>
              <div className="text-sm" style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 6 }}>✨ Opportunities</div>
              <ul style={{ paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
                {scenario.opportunities.map((o, i) => <li key={o || i} style={{ marginBottom: 4 }}>{o}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function renderMarkdown(md) {
  if (!md) return ''
  return md
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    .replace(/⚠️/g, '<span style="color:#fbbf24">⚠️</span>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match
      return match
    })
}

export default function Results() {
  const { runId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    getReport(runId)
      .then(data => { setReport(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [runId])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <span className="text-muted">Loading report...</span>
    </div>
  )

  if (error) return (
    <div className="card" style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
      <div className="card-title text-error">Report Not Ready</div>
      <p className="text-sm text-muted mt-2">{error}</p>
      <p className="text-sm text-muted mt-2">The run may still be in progress. Check the Run Monitor.</p>
      <button className="btn btn-secondary btn-sm mt-4" onClick={() => navigate(-1)}>← Go Back</button>
    </div>
  )

  const score = report.eval_score || {}
  const composite = Object.values(score).length > 0
    ? Object.values(score).reduce((a, b) => a + b, 0) / Object.values(score).length
    : 0

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'scenarios', label: '🌐 Scenarios' },
    { id: 'report', label: '📝 Full Report' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate(-1)}>← Back</button>
        <div className="flex items-center gap-3">
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-md)',
            background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 24,
          }}>📄</div>
          <div>
            <h1 className="page-title">{report.title || 'Research Report'}</h1>
            <p className="page-subtitle">
              Run <span className="font-mono">{runId}</span> · Generated {report.created_at?.slice(0, 19)}
            </p>
          </div>
        </div>
      </div>

      {/* Composite score banner */}
      {composite > 0 && (
        <div className="card mb-4" style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))',
          borderColor: 'rgba(99,102,241,0.3)',
          textAlign: 'center',
          padding: '28px',
        }}>
          <div className="text-sm text-muted" style={{ textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Research Quality Score
          </div>
          <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--text-accent)', lineHeight: 1 }}>
            {composite.toFixed(1)}
          </div>
          <div className="text-sm text-muted mt-2">out of 100</div>
          <div className="flex gap-4 mt-4" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            {Object.entries(score).map(([k, v]) => (
              <div key={k} className="stat-box">
                <span className="text-muted">{k}: </span>
                <span style={{ fontWeight: 600, color: v >= 70 ? 'var(--success)' : v >= 50 ? 'var(--text-accent)' : 'var(--warning)' }}>{v.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map(t => (
          <button key={t.id}
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <a href={`/api/runs/${runId}/report/export?format=md`}
          target="_blank" rel="noopener" className="btn btn-secondary btn-sm">📥 Export MD</a>
        <a href={`/api/runs/${runId}/report/export?format=html`}
          target="_blank" rel="noopener" className="btn btn-secondary btn-sm">🌐 Export HTML</a>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Score details */}
          <div className="card">
            <div className="card-title mb-4">📊 Quality Dimensions</div>
            <ScoreBar label="Usefulness" value={score.usefulness || 0} icon="🎯" />
            <ScoreBar label="Consistency" value={score.consistency || 0} icon="🔗" />
            <ScoreBar label="Grounding" value={score.grounding || 0} icon="📌" />
            <ScoreBar label="Diversity" value={score.diversity || 0} icon="🌈" />
            <ScoreBar label="Clarity" value={score.clarity || 0} icon="💎" />
            <ScoreBar label="Novelty" value={score.novelty || 0} icon="💡" />
          </div>

          {/* Quick stats */}
          <div className="card">
            <div className="card-title mb-4">📋 Report Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="stat-box">
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-accent)' }}>
                  {report.scenarios?.length || 0}
                </div>
                <div className="text-sm text-muted">Scenarios</div>
              </div>
              <div className="stat-box">
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-accent)' }}>
                  {report.content_md?.split('\n').length || 0}
                </div>
                <div className="text-sm text-muted">Lines</div>
              </div>
              <div className="stat-box">
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-accent)' }}>
                  {Math.round((report.content_md?.length || 0) / 5)}
                </div>
                <div className="text-sm text-muted">Words (est.)</div>
              </div>
              <div className="stat-box">
                <div style={{ fontSize: 28, fontWeight: 700, color: composite >= 70 ? 'var(--success)' : composite >= 50 ? 'var(--text-accent)' : 'var(--warning)' }}>
                  {composite >= 70 ? 'A' : composite >= 50 ? 'B' : 'C'}
                </div>
                <div className="text-sm text-muted">Grade</div>
              </div>
            </div>

            {/* SimLabel */}
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
              fontSize: 12, color: 'var(--warning)',
            }}>
              ⚠️ All outputs are simulated scenarios, not predictions. Evaluate against your own evidence.
            </div>
          </div>
        </div>
      )}

      {/* Scenarios Tab */}
      {activeTab === 'scenarios' && (
        <div>
          {report.scenarios?.length > 0 ? (
            <div className="flex flex-col gap-3">
              {report.scenarios.map((s, i) => (
                <ScenarioCard key={s.id || `scenario-${i}`} scenario={s} index={i} id={s.id} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🌐</div>
              <h3 className="empty-title">No structured scenarios</h3>
              <p className="empty-text">The simulation didn't produce structured scenario data. Check the Full Report tab for the narrative output.</p>
            </div>
          )}
        </div>
      )}

      {/* Report Tab */}
      {activeTab === 'report' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Full Research Report</div>
          </div>
          <div className="md-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(report.content_md) }}
            style={{ lineHeight: 1.8 }} />
        </div>
      )}
    </div>
  )
}
