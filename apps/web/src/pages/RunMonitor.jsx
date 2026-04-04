import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRun, stopRun } from '../api'
import PixelScene from '../features/simulation-visualization/components/PixelScene'
import { useVizStore } from '../features/simulation-visualization/store/visualizationStore'
import { toast } from '../components/Toast'

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
    return () => {
      mountedRef.current = false
      clearInterval(interval)
      disconnect()
    }
  }, [runId])

  async function loadRun() {
    try {
      const r = await getRun(runId)
      if (mountedRef.current) {
        setRun(r)
        setLoading(false)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleStop() {
    if (!window.confirm("Are you sure you want to stop this simulation?")) return
    try {
      await stopRun(runId)
      await loadRun()
      toast.info('Simulation stopped')
    } catch (e) {
      toast.error('Failed to stop run')
    }
  }

  if (loading || !run) return (
    <div className="flex items-center gap-4 mt-12 animate-in">
      <div className="spinner" style={{ width: 24, height: 24 }} />
      <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>CONNECTING TO OBSERVATION LINK...</span>
    </div>
  )

  return (
    <div className="animate-in">
      <div className="page-header flex justify-between items-end">
        <div>
          <div style={{ color: 'var(--text-neon)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '8px' }}>
            LABORATORY // OBSERVATION DECK
          </div>
          <h1 className="page-title">Run Monitor</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`badge badge-${run.status}`} aria-live="polite">
              <span className="badge-dot" />
              {run.status.toUpperCase()}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              SESSION_ID: {run.id.split('-')[0]}
            </span>
          </div>
        </div>
        
        {run.status === 'completed' && (
          <button className="btn btn-primary" onClick={() => navigate(`/run/${runId}/results`)}>
            Synthesize Results →
          </button>
        )}
        {run.status === 'running' && (
          <button className="btn btn-secondary" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={handleStop}>
            🛑 Stop Simulation
          </button>
        )}
      </div>

      {/* Control Panel Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', marginBottom: '24px' }}>
        
        {/* Main Stage: Living Lab */}
        <div style={{ 
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--border)', 
          borderRadius: 'var(--radius-lg)', 
          height: '650px',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)',
          position: 'relative'
        }}>
          <div style={{ 
            position: 'absolute', top: 12, left: 12, zIndex: 5,
            padding: '4px 10px', background: 'rgba(0,0,0,0.6)', 
            border: '1px solid var(--border)', borderRadius: '4px',
            fontSize: '10px', color: 'var(--text-neon)', opacity: 0.8,
            fontFamily: 'var(--font-mono)', pointerEvents: 'none'
          }}>
            LIVING_LAB_FEED // LIVE
          </div>
          <PixelScene runId={runId} />
        </div>

        {/* Sidebar: Unit Stats & Live Feeds */}
        <div className="flex flex-col gap-4">
          <div className="card" style={{ flex: 1, maxHeight: '300px', overflowY: 'auto' }}>
            <div className="panel-header">UNIT_TELEMETRY</div>
            
            <div className="flex flex-col gap-6">
              <div>
                <div className="text-sm text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Simulation Mode</div>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '15px' }}>{run.mode?.toUpperCase()}</div>
              </div>

              <div>
                <div className="text-sm text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Temporal Start</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{run.started_at?.slice(11, 19)} <span style={{ opacity: 0.5 }}>{run.started_at?.slice(0, 10)}</span></div>
              </div>

              <div>
                <div className="text-sm text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Config Profile</div>
                <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-accent)', wordBreak: 'break-all' }}>{run.config_id}</div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <div className="text-sm text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px' }}>Neural Activity</div>
                <div className="score-bar-wrap">
                  <div className="score-bar" style={{ height: 4 }}>
                    <div className="score-fill" style={{ width: run.status === 'running' ? '65%' : run.status === 'completed' ? '100%' : '0%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ flex: 1, maxHeight: '334px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>LIVE_INTEL_FEED</span>
              {feedEvents.length > 0 && <span style={{ color: 'var(--success)' }}>● ACTIVE</span>}
            </div>
            
            <div className="flex flex-col gap-3" style={{ flex: 1 }}>
              {feedEvents.length === 0 ? (
                <div style={{ opacity: 0.5, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  AWAITING_EXTERNAL_DATA...
                </div>
              ) : (
                [...feedEvents].reverse().map((evt) => (
                  <div key={evt.id || evt.timestamp || `${evt.type}-${evt.round}`} className={`feed-item ${evt.type === 'tool_result' ? 'feed-item-accent' : 'feed-item-neon'}`}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: evt.type === 'tool_result' ? 'var(--text-accent)' : 'var(--text-neon)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{evt.type === 'tool_result' ? `🔧 TOOL: ${evt.toolId}` : `📡 LIVE: ${evt.sourceType?.toUpperCase()}`}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>R{evt.round}</span>
                    </div>
                    {evt.type === 'tool_result' ? (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-primary)', marginBottom: '4px', fontStyle: 'italic' }}>"{evt.query}"</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{evt.resultPreview}</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{evt.title}</div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {run.error && (
            <div className="card" style={{ borderColor: 'var(--error)', background: 'rgba(239, 68, 68, 0.05)' }}>
              <div style={{ fontSize: '10px', color: 'var(--error)', fontWeight: 700, marginBottom: '8px' }}>SYSTEM_FAILURE</div>
              <div style={{ color: 'var(--error)', fontSize: '12px', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>{run.error}</div>
            </div>
          )}
        </div>
      </div>

      {/* Log Console */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="panel-header" style={{ marginBottom: 0 }}>CONSOLE_LOG_STREAM</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>T_OFFSET: +00:00:42.5</div>
        </div>
        <div className="log-viewer" style={{ border: '1px solid var(--border)', background: 'rgba(0,0,0,0.6)', maxHeight: '200px' }}>
          {run.log ? (
            run.log.split('\n').map((line, i) => (
              <div key={i} className="log-line" style={{ fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)', marginRight: '12px' }}>[{i.toString().padStart(4, '0')}]</span>
                {line}
              </div>
            ))
          ) : (
            <div className="text-muted text-xs">AWAITING_STREAM_INPUT...</div>
          )}
        </div>
      </div>
    </div>
  )
}
