import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getReport } from '../api'
import { toast } from '../components/Toast'
import { Crosshair, Link, Pin, Palette, Gem, Lightbulb, ClipboardList, FileText, BarChart3, Globe, Download, AlertTriangle, ChevronDown, Inbox } from 'lucide-react'

function ScoreBar({ label, value, icon: Icon }) {
  const getColor = (v) => {
    if (v >= 80) return 'var(--success)'
    if (v >= 60) return 'var(--primary)'
    if (v >= 40) return 'var(--warning)'
    return 'var(--error)'
  }
  return (
    <div className="score-bar-wrap">
      <span className="score-label"><Icon size={14} style={{ marginRight: 4 }} /> {label}</span>
      <div className="score-bar">
        <div className="score-fill" style={{
          width: `${value}%`,
          background: getColor(value),
        }} />
      </div>
      <span className="score-value" style={{ color: getColor(value) }}>{value.toFixed(1)}</span>
    </div>
  )
}

function ScenarioCard({ scenario, index }) {
  const [expanded, setExpanded] = useState(false)
  const probNum = typeof scenario.probability_percentage === 'number' 
    ? scenario.probability_percentage 
    : parseInt(scenario.probability_percentage) || parseInt(scenario.probability_assessment) || 50

  let prob
  if (probNum >= 70) prob = { bg: 'var(--success-container)', color: 'var(--success)' }
  else if (probNum >= 30) prob = { bg: 'var(--warning-container)', color: 'var(--warning)' }
  else prob = { bg: 'var(--error-container)', color: 'var(--error)' }

  return (
    <div className="card" style={{ border: '1px solid var(--outline-variant)', cursor: 'pointer' }}
      onClick={() => setExpanded(!expanded)}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && setExpanded(!expanded)}
      aria-expanded={expanded}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
            background: 'var(--primary-container)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--on-primary-container)',
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
                {scenario.probability_percentage !== undefined ? `${probNum}%` : scenario.probability_assessment} probability
              </span>
            )}
          </div>
        </div>
        <ChevronDown size={16} style={{ color: 'var(--on-surface-variant-muted)', transition: 'transform 200ms', transform: expanded ? 'rotate(180deg)' : 'none' }} />
      </div>

      <p className="text-sm text-muted" style={{ marginTop: 12, lineHeight: 1.7 }}>
        {expanded ? scenario.description : scenario.description?.slice(0, 180) + (scenario.description?.length > 180 ? '...' : '')}
      </p>

      {expanded && (
        <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          {scenario.key_drivers?.length > 0 && (
            <div>
              <div className="text-sm" style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: '6px' }}><Pin size={14} /> Key Drivers</div>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {scenario.key_drivers.map((d, i) => (
                  <span key={d || i} style={{
                    padding: '4px 10px', borderRadius: 16, fontSize: 12,
                    background: 'var(--primary-container)',
                    color: 'var(--on-primary-container)',
                  }}>{d}</span>
                ))}
              </div>
            </div>
          )}
          {scenario.risks?.length > 0 && (
            <div>
              <div className="text-sm" style={{ fontWeight: 600, color: 'var(--error)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} /> Risks</div>
              <ul style={{ paddingLeft: 20, fontSize: 13, color: 'var(--on-surface-variant)' }}>
                {scenario.risks.map((r, i) => <li key={r || i} style={{ marginBottom: 4 }}>{r}</li>)}
              </ul>
            </div>
          )}
          {scenario.opportunities?.length > 0 && (
            <div>
              <div className="text-sm" style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: '6px' }}><Lightbulb size={14} /> Opportunities</div>
              <ul style={{ paddingLeft: 20, fontSize: 13, color: 'var(--on-surface-variant)' }}>
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
    .replace(/\n\n/g, '</p><p>')
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
      <div style={{ marginBottom: 16, color: 'var(--on-surface-variant-muted)' }}><Inbox size={48} /></div>
      <div className="card-title" style={{ color: 'var(--error)' }}>Report Not Ready</div>
      <p className="text-sm text-muted mt-2">{error}</p>
      <p className="text-sm text-muted mt-2">The run may still be in progress. Check the Run Monitor.</p>
      <button className="btn btn-secondary btn-sm mt-4" onClick={() => navigate(-1)}>Go Back</button>
    </div>
  )

  const score = report.eval_score || {}
  const composite = Object.values(score).length > 0
    ? Object.values(score).reduce((a, b) => a + b, 0) / Object.values(score).length
    : 0

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'scenarios', label: 'Scenarios', icon: Globe },
    { id: 'report', label: 'Full Report', icon: FileText },
  ]

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate(-1)}>Back</button>
        <div className="flex items-center gap-3">
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-md)',
            background: 'var(--primary-container)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--on-primary-container)',
          }}><FileText size={24} /></div>
          <div>
            <h1 className="page-title" style={{ fontSize: 24 }}>{report.title || 'Research Report'}</h1>
            <p className="page-subtitle">
              Run <span className="font-mono">{runId}</span> · Generated {report.created_at?.slice(0, 19)}
            </p>
          </div>
        </div>
      </div>

      {/* Composite score banner */}
      {composite > 0 && (
        <div className="card mb-4" style={{
          background: 'var(--primary-container)',
          borderColor: 'var(--primary)',
          textAlign: 'center',
          padding: '28px',
        }}>
          <div className="text-sm text-muted" style={{ textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Research Quality Score
          </div>
          <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--on-primary-container)', lineHeight: 1 }}>
            {composite.toFixed(1)}
          </div>
          <div className="text-sm text-muted mt-2">out of 100</div>
          <div className="flex gap-4 mt-4" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            {Object.entries(score).map(([k, v]) => (
              <div key={k} className="stat-box" style={{ background: 'var(--surface-container)' }}>
                <span className="text-muted">{k}: </span>
                <span style={{ fontWeight: 600, color: v >= 70 ? 'var(--success)' : v >= 50 ? 'var(--primary)' : 'var(--warning)' }}>{v.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id}
              className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setActiveTab(t.id)}>
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <a href={`/api/runs/${runId}/report/export?format=md`}
          target="_blank" rel="noopener" className="btn btn-secondary btn-sm"><Download size={14} /> MD</a>
        <a href={`/api/runs/${runId}/report/export?format=html`}
          target="_blank" rel="noopener" className="btn btn-secondary btn-sm"><Download size={14} /> HTML</a>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div className="card-title mb-4">Quality Dimensions</div>
            <ScoreBar label="Usefulness" value={score.usefulness || 0} icon={Crosshair} />
            <ScoreBar label="Consistency" value={score.consistency || 0} icon={Link} />
            <ScoreBar label="Grounding" value={score.grounding || 0} icon={Pin} />
            <ScoreBar label="Diversity" value={score.diversity || 0} icon={Palette} />
            <ScoreBar label="Clarity" value={score.clarity || 0} icon={Gem} />
            <ScoreBar label="Novelty" value={score.novelty || 0} icon={Lightbulb} />
          </div>

          <div className="card">
            <div className="card-title mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={18} /> Report Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="stat-box">
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>
                  {report.scenarios?.length || 0}
                </div>
                <div className="text-sm text-muted">Scenarios</div>
              </div>
              <div className="stat-box">
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>
                  {report.content_md?.split('\n').length || 0}
                </div>
                <div className="text-sm text-muted">Lines</div>
              </div>
              <div className="stat-box">
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>
                  {Math.round((report.content_md?.length || 0) / 5)}
                </div>
                <div className="text-sm text-muted">Words (est.)</div>
              </div>
              <div className="stat-box">
                <div style={{ fontSize: 28, fontWeight: 700, color: composite >= 70 ? 'var(--success)' : composite >= 50 ? 'var(--primary)' : 'var(--warning)' }}>
                  {composite >= 70 ? 'A' : composite >= 50 ? 'B' : 'C'}
                </div>
                <div className="text-sm text-muted">Grade</div>
              </div>
            </div>

            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              background: 'var(--warning-container)', border: '1px solid var(--warning)',
              fontSize: 12, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <AlertTriangle size={14} /> All outputs are simulated scenarios, not predictions. Evaluate against your own evidence.
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
                <ScenarioCard key={s.id || `scenario-${i}`} scenario={s} index={i} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><Globe size={48} /></div>
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
