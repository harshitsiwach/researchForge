import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createRun, listSeeds } from '../api'
import { toast } from '../components/Toast'

const MODES = [
  { value: 'explore', label: '🔭 Explore', desc: 'Open-ended research, generate hypotheses and scenario branches' },
  { value: 'decision', label: '🎯 Decision', desc: 'Stress-test a plan, idea, or draft through simulation and critique' },
  { value: 'compare', label: '⚖️ Compare', desc: 'Compare alternatives like product ideas, pricing, or architectures' },
  { value: 'improve', label: '🔄 Improve', desc: 'Run a controlled experiment to find better research configs' },
]

export default function RunBuilder() {
  const { wsId, projId } = useParams()
  const navigate = useNavigate()
  const [mode, setMode] = useState('explore')
  const [numAgents, setNumAgents] = useState(6)
  const [numRounds, setNumRounds] = useState(8)
  const [debateStyle, setDebateStyle] = useState('structured')
  const [critiqueStrength, setCritiqueStrength] = useState('medium')
  const [endlessMode, setEndlessMode] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [seeds, setSeeds] = useState([])
  const [selectedSeeds, setSelectedSeeds] = useState([])
  const [loadingSeeds, setLoadingSeeds] = useState(true)

  useEffect(() => {
    listSeeds(projId)
      .then(s => { setSeeds(s); if (s.length > 0) setSelectedSeeds(s.map(s => s.id)) })
      .catch(() => {})
      .finally(() => setLoadingSeeds(false))
  }, [projId])

  async function handleLaunch() {
    if (numAgents < 2 || numAgents > 16) {
      return toast.warning('Number of agents must be between 2 and 16')
    }
    setLaunching(true)
    try {
      const result = await createRun(projId, {
        mode,
        num_agents: numAgents,
        num_rounds: numRounds,
        debate_style: debateStyle,
        critique_strength: critiqueStrength,
        endless_mode: endlessMode,
        seed_ids: selectedSeeds,
      })
      toast.success('Simulation launched successfully')
      navigate(`/run/${result.run_id}`)
    } catch (e) {
      toast.error('Failed to launch: ' + e.message)
      setLaunching(false)
    }
  }

  function toggleSeed(id) {
    setSelectedSeeds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  function selectAllSeeds() {
    setSelectedSeeds(seeds.map(s => s.id))
  }

  function clearAllSeeds() {
    setSelectedSeeds([])
  }

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-ghost btn-sm mb-2"
          onClick={() => navigate(`/workspace/${wsId}/project/${projId}`)}>← Back to Project</button>
        <h1 className="page-title">Launch Run</h1>
        <p className="page-subtitle">Configure and launch a simulation run</p>
      </div>

      {/* Mode selection */}
      <div className="card mb-4">
        <div className="card-title mb-4">Select Mode</div>
        <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {MODES.map(m => (
            <div key={m.value}
              className={`card mode-card ${mode === m.value ? 'mode-card-selected' : ''}`}
              onClick={() => setMode(m.value)}
              role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setMode(m.value)}
              aria-pressed={mode === m.value}>
              <div className="card-title">{m.label}</div>
              <p className="text-sm text-muted mt-2">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Seed Selection */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="card-title">📄 Select Seeds</div>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={selectAllSeeds} disabled={seeds.length === 0}>Select All</button>
            <button className="btn btn-ghost btn-sm" onClick={clearAllSeeds} disabled={selectedSeeds.length === 0}>Clear</button>
          </div>
        </div>
        {loadingSeeds ? (
          <div className="flex items-center gap-3"><div className="spinner" /> <span className="text-sm text-muted">Loading seeds...</span></div>
        ) : seeds.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <p className="empty-text">No seeds available. Upload seeds in the project page first.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {seeds.map(s => (
              <div key={s.id}
                className="flex items-center gap-3"
                style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                  background: selectedSeeds.includes(s.id) ? 'rgba(99,102,241,0.1)' : 'rgba(15,23,42,0.5)',
                  border: `1px solid ${selectedSeeds.includes(s.id) ? 'var(--accent-indigo)' : 'var(--border)'}`,
                  cursor: 'pointer' }}
                onClick={() => toggleSeed(s.id)}
                role="checkbox" aria-checked={selectedSeeds.includes(s.id)} tabIndex={0}
                onKeyDown={e => e.key === ' ' && (e.preventDefault(), toggleSeed(s.id))}>
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${selectedSeeds.includes(s.id) ? 'var(--accent-indigo)' : 'var(--border)'}`,
                  background: selectedSeeds.includes(s.id) ? 'var(--accent-indigo)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 12, transition: 'all 0.2s'
                }}>
                  {selectedSeeds.includes(s.id) && '✓'}
                </div>
                <span className="text-sm" style={{ flex: 1 }}>{s.filename}</span>
                <span className="text-sm text-muted">{s.created_at?.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="text-sm text-muted mt-2">{selectedSeeds.length} of {seeds.length} seeds selected</div>
      </div>

      {/* Config */}
      <div className="card mb-4">
        <div className="card-title mb-4">Simulation Configuration</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Number of Agents</label>
            <input className="form-input" type="number" min={2} max={16}
              value={numAgents} onChange={e => setNumAgents(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ opacity: endlessMode ? 0.5 : 1 }}>Number of Rounds</label>
            <input className="form-input" type="number" min={2} max={20} disabled={endlessMode}
              value={numRounds} onChange={e => setNumRounds(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Debate Style</label>
            <select className="form-select" value={debateStyle} onChange={e => setDebateStyle(e.target.value)}>
              <option value="structured">Structured</option>
              <option value="freeform">Freeform</option>
              <option value="adversarial">Adversarial</option>
              <option value="collaborative">Collaborative</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Critique Strength</label>
            <select className="form-select" value={critiqueStrength} onChange={e => setCritiqueStrength(e.target.value)}>
              <option value="light">Light</option>
              <option value="medium">Medium</option>
              <option value="strong">Strong</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
            <input type="checkbox" id="endlessToggle" 
              checked={endlessMode} onChange={e => setEndlessMode(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}/>
            <div>
              <label htmlFor="endlessToggle" className="form-label mb-0" style={{ cursor: 'pointer', display: 'block' }}>♾️ Endless Mode (Living Lab)</label>
              <div className="text-xs text-muted" style={{ marginTop: '2px' }}>Run agents continuously, injecting new live data streams endlessly until manually stopped.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Launch */}
      <button className="btn btn-primary" onClick={handleLaunch} disabled={launching}
        style={{ fontSize: 16, padding: '14px 32px' }}>
        {launching ? (
          <><div className="spinner" style={{ width: 16, height: 16 }} /> Launching...</>
        ) : (
          '🚀 Launch Simulation Run'
        )}
      </button>
    </div>
  )
}
