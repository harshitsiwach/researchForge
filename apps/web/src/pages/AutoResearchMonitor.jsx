import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAutoResearchJob, stopAutoResearchJob } from '../api'
import PixelScene from '../features/simulation-visualization/components/PixelScene'
import { useVizStore } from '../features/simulation-visualization/store/visualizationStore'

// A small functional component to render the flowchart based on event history
function ResearchFlowchart({ events, currentStatus }) {
  // Derive cycles from events connecting "planning" -> "researching" -> "drafting" -> "simulating" -> "refining"
  const cycles = []
  let currentCycle = []

  // Group events by cycle
  events.forEach(evt => {
    if (evt.type === 'researcher_status_changed' && evt.status === 'planning') {
      if (currentCycle.length > 0) cycles.push(currentCycle)
      currentCycle = [evt]
    } else {
      currentCycle.push(evt)
    }
  })
  if (currentCycle.length > 0) cycles.push(currentCycle)

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-neon)', fontWeight: 700, marginBottom: '16px' }}>RESEARCH_FLOWCHART</div>
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
        
        {cycles.length === 0 && (
          <div className="text-muted text-xs flex items-center justify-center h-full" style={{ opacity: 0.5, fontFamily: 'var(--font-mono)' }}>
            INITIALIZING_ORCHESTRATOR...
          </div>
        )}

        {cycles.map((cycle, i) => {
          const isLatest = i === cycles.length - 1;
          const steps = ['planning', 'researching', 'drafting', 'simulating', 'refining'];
          // Find which step we are currently on in this cycle
          const statusEvents = cycle.filter(e => e.type === 'researcher_status_changed');
          const lastStatus = statusEvents.length > 0 ? statusEvents[statusEvents.length - 1].status : 'planning';
          const lastStatusIdx = steps.indexOf(lastStatus);

          return (
            <div key={i} style={{ marginBottom: '24px', position: 'relative' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '12px' }}>
                CYCLE {i + 1}
              </div>
              
              {/* Draw nodes for each step */}
              {steps.map((step, stepIdx) => {
                const isActive = isLatest && lastStatusIdx === stepIdx;
                const isPast = !isLatest || lastStatusIdx > stepIdx;
                const hasEvent = cycle.find(e => e.type === 'researcher_status_changed' && e.status === step);

                if (!hasEvent && !isActive) return null;

                // Grab interesting metadata for this step
                let meta = null;
                if (step === 'researching') {
                  const toolCall = cycle.find(e => e.type === 'tool_called');
                  if (toolCall) meta = `Using [${toolCall.toolId}]`;
                }

                return (
                  <div key={step} style={{ display: 'flex', gap: '12px', marginBottom: '16px', position: 'relative' }}>
                    {/* Connection Line */}
                    {stepIdx < 4 && <div style={{ 
                      position: 'absolute', left: '11px', top: '24px', bottom: '-16px', width: '2px', 
                      background: isPast ? 'var(--text-neon)' : 'var(--border)',
                      zIndex: 1
                    }} />}

                    {/* Node Dot */}
                    <div style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', backgroundColor: isActive ? 'var(--bg-card)' : isPast ? 'var(--text-neon)' : 'var(--bg-secondary)',
                      border: `2px solid ${isActive ? 'var(--text-neon)' : isPast ? 'var(--text-neon)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
                      boxShadow: isActive ? '0 0 15px var(--text-neon)' : 'none'
                    }}>
                      {isActive && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-neon)', animation: 'pulse 1.5s infinite' }} />}
                    </div>

                    {/* Node Content */}
                    <div style={{ pt: '2px' }}>
                      <div style={{ 
                        fontSize: '13px', fontWeight: isActive ? 700 : 500, 
                        color: isActive ? 'var(--text-primary)' : isPast ? 'var(--text-secondary)' : 'var(--text-muted)',
                        textTransform: 'capitalize'
                      }}>
                        {step}
                      </div>
                      {meta && <div style={{ fontSize: '11px', color: 'var(--text-accent)', fontFamily: 'var(--font-mono)', mt: '2px' }}>{meta}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AutoResearchMonitor() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  
  const [job, setJob] = useState(null)
  const [events, setEvents] = useState([])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState('connecting') 
  const [researcherState, setResearcherState] = useState({ status: 'initializing', message: 'Booting up...' })
  
  const eventSourceRef = useRef(null)
  const { handleEvent: handleVizEvent, disconnect: disconnectViz } = useVizStore()

  useEffect(() => {
    loadJob()
    connectSSE()
    const interval = setInterval(loadJob, 2000)
    return () => {
      clearInterval(interval)
      if (eventSourceRef.current) eventSourceRef.current.close()
      disconnectViz()
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
    
    // Reset viz store state manually if needed, but disconnect handles it
    useVizStore.setState({ status: 'streaming', runId: `auto-${jobId}`, agents: {}, timeline: [], debateStats: { active: false, scenariosCount: 0, round: 0 } })

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
        
        // Append to local event log
        setEvents(prev => [...prev, evt])

        // Handle specific orchestrator events
        if (evt.type === 'researcher_status_changed') {
          setResearcherState({ status: evt.status, message: evt.message })
        } else if (evt.type === 'draft_updated') {
          setDraft(evt.draft)
        }

        // Forward internal simulation events directly to the visualizer store!
        if (evt.is_mini_sim) {
          handleVizEvent(evt)
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

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 400px', gap: '24px', height: '700px' }}>
        
        {/* Left Column: Research Flowchart */}
        <ResearchFlowchart events={events} currentStatus={researcherState.status} />

        {/* Middle Column: The Working Draft */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
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

        {/* Right Column: Brain state, Pixel Agents & Event Log */}
        <div className="flex flex-col gap-4" style={{ height: '100%' }}>
          
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

          {/* Pixel Agents Debate Room overlay when simulating */}
          {researcherState.status === 'simulating' && (
            <div style={{ flexShrink: 0, height: '220px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid #00ffa3', boxShadow: '0 0 20px rgba(0,255,163,0.15)' }}>
               {/* We force the PixelScene to render but wrap it so it fits the small container */}
               <div style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%', height: '125%' }}>
                 <PixelScene runId={`auto-${jobId}`} />
               </div>
            </div>
          )}

          {/* Activity Log */}
          <div className="card" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
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
