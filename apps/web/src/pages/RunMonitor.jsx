import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRun, stopRun } from '../api'
import PixelScene from '../features/simulation-visualization/components/PixelScene'
import { useVizStore } from '../features/simulation-visualization/store/visualizationStore'
import { toast } from '../components/Toast'
import { Square, Wrench, Rss, ArrowRight, AlertCircle, Terminal } from 'lucide-react'

const POLL_INTERVAL = 2000

export default function RunMonitor() {
  const { runId } = useParams()
  const navigate = useNavigate()
  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const { connect, disconnect, timeline } = useVizStore()
  const mountedRef = useRef(true)

  const feedEvents = timeline.filter(e =>
    e.type === 'tool_called' || e.type === 'tool_result' || e.type === 'live_data_received'
  )

  useEffect(() => {
    mountedRef.current = true
    loadRun()
    connect(runId)
    const interval = setInterval(loadRun, POLL_INTERVAL)
    return () => { mountedRef.current = false; clearInterval(interval); disconnect() }
  }, [runId])

  async function loadRun() {
    try {
      const r = await getRun(runId)
      if (mountedRef.current) { setRun(r); setLoading(false) }
    } catch (e) { console.error(e) }
  }

  async function handleStop() {
    if (!window.confirm("Are you sure you want to stop this simulation?")) return
    try { await stopRun(runId); await loadRun(); toast.info('Simulation stopped') }
    catch (e) { toast.error('Failed to stop run') }
  }

  if (loading || !run) return (
    <div className="flex items-center gap-4 mt-12 animate-in">
      <div className="spinner" style={{ width: 24, height: 24 }} />
      <span style={{ color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em' }}>CONNECTING...</span>
    </div>
  )

  return (
    <div className="animate-in">
      <div className="page-header flex justify-between items-end">
        <div>
          <div className="page-tag">LABORATORY_OBSERVATION</div>
          <h1 className="page-title">Run Monitor</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`badge badge-${run.status}`} aria-live="polite"><span className="badge-dot" />{run.status}</span>
            <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>{run.id.split('-')[0]}</span>
          </div>
        </div>
        {run.status === 'completed' && (
          <button className="btn btn-primary manga-border" onClick={() => navigate(`/run/${runId}/results`)}>
            VIEW RESULTS <ArrowRight size={16} />
          </button>
        )}
        {run.status === 'running' && (
          <button className="btn btn-ghost" style={{ color: 'var(--error)', borderColor: 'var(--error)' }} onClick={handleStop}>
            <Square size={14} /> STOP
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', marginBottom: '24px' }}>
        {/* Main Stage */}
        <div style={{ background: 'var(--surface-container-highest)', border: '4px solid var(--ink-black)', borderRadius: 0, height: '650px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 5, padding: '4px 10px', background: 'var(--surface-container)', border: '2px solid var(--outline-variant)', fontSize: '10px', color: 'var(--primary)', fontWeight: 700, fontFamily: 'var(--font-label)', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge-dot" style={{ width: 6, height: 6 }} /> LIVE
          </div>
          <PixelScene runId={runId} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="card" style={{ flex: 1, maxHeight: '300px', overflowY: 'auto' }}>
            <div className="panel-header">RUN_DETAILS</div>
            <div className="flex flex-col gap-6">
              <div>
                <div className="text-sm text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'var(--font-label)' }}>Mode</div>
                <div style={{ color: 'var(--on-surface)', fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-headline)', textTransform: 'uppercase' }}>{run.mode}</div>
              </div>
              <div>
                <div className="text-sm text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'var(--font-label)' }}>Started</div>
                <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>{run.started_at?.slice(11, 19)} <span style={{ opacity: 0.5 }}>{run.started_at?.slice(0, 10)}</span></div>
              </div>
              <div>
                <div className="text-sm text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'var(--font-label)' }}>Configuration</div>
                <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--primary)', wordBreak: 'break-all' }}>{run.config_id}</div>
              </div>
              <div style={{ borderTop: '2px solid var(--outline-variant)', paddingTop: 16 }}>
                <div className="text-sm text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '12px', fontFamily: 'var(--font-label)' }}>Progress</div>
                <div className="score-bar" style={{ height: 8 }}>
                  <div className="score-fill" style={{ width: run.status === 'running' ? '65%' : run.status === 'completed' ? '100%' : '0%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ flex: 1, maxHeight: '334px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>LIVE_FEED</span>
              {feedEvents.length > 0 && <span style={{ color: 'var(--secondary)', fontSize: '10px' }}>ACTIVE</span>}
            </div>
            <div className="flex flex-col gap-3" style={{ flex: 1 }}>
              {feedEvents.length === 0 ? (
                <div style={{ opacity: 0.5, fontSize: '11px', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'var(--font-label)' }}>
                  AWAITING_DATA...
                </div>
              ) : (
                [...feedEvents].reverse().map((evt) => (
                  <div key={evt.id || evt.timestamp || `${evt.type}-${evt.round}`} className={`feed-item ${evt.type === 'tool_result' ? 'feed-item-accent' : 'feed-item-neon'}`}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: evt.type === 'tool_result' ? 'var(--primary)' : 'var(--tertiary)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-label)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {evt.type === 'tool_result' ? <Wrench size={10} /> : <Rss size={10} />}
                        {evt.type === 'tool_result' ? evt.toolId : evt.sourceType}
                      </span>
                      <span style={{ color: 'var(--on-surface-variant)' }}>R{evt.round}</span>
                    </div>
                    {evt.type === 'tool_result' ? (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--on-surface)', marginBottom: '4px', fontStyle: 'italic' }}>"{evt.query}"</div>
                        <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{evt.resultPreview}</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: 'var(--on-surface)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{evt.title}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {run.error && (
            <div className="card" style={{ borderColor: 'var(--error)', background: 'var(--error-container)' }}>
              <div style={{ fontSize: '11px', color: 'var(--error)', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', fontFamily: 'var(--font-label)' }}><AlertCircle size={14} /> Error</div>
              <div style={{ color: 'var(--error)', fontSize: '12px', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>{run.error}</div>
            </div>
          )}
        </div>
      </div>

      {/* Log Console */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="panel-header" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><Terminal size={14} /> CONSOLE</div>
        </div>
        <div className="log-viewer" style={{ maxHeight: '200px' }}>
          {run.log ? (
            run.log.split('\n').map((line, i) => (
              <div key={i} className="log-line" style={{ fontSize: '11px' }}>
                <span style={{ color: 'var(--on-surface-variant)', marginRight: '12px' }}>[{i.toString().padStart(4, '0')}]</span>
                {line}
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--on-surface-variant)', fontSize: '12px', fontFamily: 'var(--font-label)' }}>NO_CONSOLE_OUTPUT...</div>
          )}
        </div>
      </div>
    </div>
  )
}
