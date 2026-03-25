import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAutoResearchJob, stopAutoResearchJob } from '../api'

export default function AutoResearchMonitor() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  
  const [job, setJob] = useState(null)
  const [events, setEvents] = useState([])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState('connecting') // connecting, streaming, finished, error
  const [researcherState, setResearcherState] = useState({ status: 'initializing', message: 'Booting up...' })
  
  const eventSourceRef = useRef(null)

  useEffect(() => {
    loadJob()
    connectSSE()
    const interval = setInterval(loadJob, 2000)
    return () => {
      clearInterval(interval)
      if (eventSourceRef.current) eventSourceRef.current.close()
    }
  }, [jobId])

  async function loadJob() {
    try {
      const j = await getAutoResearchJob(jobId)
      setJob(j)
      if (j.working_draft_md && !draft) setDraft(j.working_draft_md)
    } catch (e) {
      console.error(e)
    }
  }

  function connectSSE() {
    if (eventSourceRef.current) eventSourceRef.current.close()

    setStatus('connecting')
    const es = new EventSource(`/api/auto_research/${jobId}/events`)

    es.onopen = () => setStatus('streaming')

    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data)
        if (evt.type === 'stream_end') {
          setStatus('finished')
          es.close()
          return
        }
        
        // Append to event log
        setEvents(prev => [...prev, evt])

        // Handle specific event types
        if (evt.type === 'researcher_status_changed') {
          setResearcherState({ status: evt.status, message: evt.message })
        } else if (evt.type === 'draft_updated') {
          setDraft(evt.draft)
        }
        
      } catch (err) {
        console.error("Failed to parse event", err)
      }
    }

    es.onerror = (err) => {
      console.error("SSE Error", err)
      es.close()
      setStatus('error')
    }

    eventSourceRef.current = es
  }

  async function handleStop() {
    if (!window.confirm("Are you sure you want to stop this Auto-Researcher?")) return;
    try {
      await stopAutoResearchJob(jobId)
      await loadJob()
    } catch (e) {
      alert("Failed to stop job")
    }
  }

  if (!job) return (
    <div className="flex items-center gap-4 mt-12 animate-in">
      <div className="spinner" style={{ width: 24, height: 24 }} />
      <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>CONNECTING TO RESEARCHER BRAIN...</span>
    </div>
  )

  return (
    <div className="animate-in">
      <div className="page-header flex justify-between items-end">
        <div>
          <div style={{ color: 'var(--text-neon)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '8px' }}>
            AUTONOMOUS // RESEARCHER TERMINAL
          </div>
          <h1 className="page-title">Working on: "{job.topic}"</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`badge badge-${job.status}`}>
              <span className="badge-dot" />
              {job.status.toUpperCase()}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              JOB_ID: {job.id.split('-')[0]}
            </span>
          </div>
        </div>
        
        {job.status === 'running' && (
          <button className="btn btn-secondary" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={handleStop}>
            🛑 Stop Researcher
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
        
        {/* Left Column: The Working Draft */}
        <div className="card" style={{ height: '700px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-neon)', fontWeight: 700 }}>SYNTHESIS // WORKING_DRAFT.MD</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              CHAR_COUNT: {draft.length}
            </div>
          </div>
          
          <div style={{
            flex: 1,
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '16px',
            overflowY: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            lineHeight: 1.6,
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap'
          }}>
            {draft || <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>[Document empty... awaiting synthesis]</span>}
          </div>
        </div>

        {/* Right Column: Brain state & Event Log */}
        <div className="flex flex-col gap-4">
          
          {/* Current Status Box */}
          <div className="card" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-neon)', fontWeight: 700, marginBottom: '12px' }}>RESEARCHER_STATE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="spinner" style={{ width: 16, height: 16, borderTopColor: 'var(--text-accent)', opacity: job.status === 'running' ? 1 : 0 }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  {researcherState.status}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {researcherState.message}
                </div>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="card" style={{ flex: 1, maxHeight: '560px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-neon)', fontWeight: 700, marginBottom: '16px' }}>THOUGHT_STREAM</div>
            
            <div className="flex flex-col gap-3 overflow-y-auto pr-1" style={{ flex: 1 }}>
              {events.length === 0 ? (
                <div className="text-muted text-xs flex items-center justify-center h-full" style={{ opacity: 0.5, fontFamily: 'var(--font-mono)' }}>
                  AWAITING_NEURAL_ACTIVITY...
                </div>
              ) : (
                [...events].reverse().map((evt, i) => (
                  <div key={i} style={{ 
                    background: evt.is_mini_sim ? 'rgba(0, 255, 128, 0.05)' : 'rgba(0,0,0,0.4)', 
                    border: '1px solid var(--border)', 
                    borderLeft: `2px solid ${evt.type === 'tool_result' ? 'var(--text-accent)' : evt.is_mini_sim ? '#00ffa3' : 'var(--text-neon)'}`,
                    padding: '8px 10px',
                    borderRadius: '4px',
                    opacity: evt.is_mini_sim ? 0.9 : 1
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: evt.is_mini_sim ? '#00ffa3' : 'var(--text-neon)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>
                        {evt.is_mini_sim ? '🤖 PEER_REVIEW' : evt.type.toUpperCase()}
                      </span>
                    </div>
                    
                    {evt.type === 'tool_called' && (
                      <div style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                        Calling {evt.toolId} with query: <span style={{ color: 'var(--text-accent)' }}>"{evt.query}"</span>
                      </div>
                    )}
                    
                    {evt.type === 'tool_result' && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {evt.resultPreview}
                      </div>
                    )}

                    {evt.type === 'researcher_status_changed' && (
                      <div style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{evt.message}</div>
                    )}

                    {evt.is_mini_sim && evt.message && (
                      <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontStyle: 'italic' }}>"{evt.message}"</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}
