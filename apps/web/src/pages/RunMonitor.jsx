import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRun } from '../api'
import PixelScene from '../features/simulation-visualization/components/PixelScene'
import { useVizStore } from '../features/simulation-visualization/store/visualizationStore'

export default function RunMonitor() {
  const { runId } = useParams()
  const navigate = useNavigate()
  const [run, setRun] = useState(null)
  const { connect, disconnect } = useVizStore()

  useEffect(() => {
    loadRun()
    connect(runId)
    const interval = setInterval(loadRun, 2000)
    return () => {
      clearInterval(interval)
      disconnect()
    }
  }, [runId])

  async function loadRun() {
    try {
      const r = await getRun(runId)
      setRun(r)
    } catch (e) {
      console.error(e)
    }
  }

  if (!run) return (
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
            <span className={`badge badge-${run.status}`}>
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

        {/* Sidebar: Unit Stats */}
        <div className="flex flex-col gap-4">
          <div className="card" style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: 'var(--text-neon)', fontWeight: 700, marginBottom: '16px' }}>UNIT_TELEMETRY</div>
            
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
          <div style={{ fontSize: '10px', color: 'var(--text-neon)', fontWeight: 700 }}>CONSOLE_LOG_STREAM</div>
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
