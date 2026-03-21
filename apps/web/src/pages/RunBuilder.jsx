import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createRun } from '../api'

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
  const [launching, setLaunching] = useState(false)

  async function handleLaunch() {
    setLaunching(true)
    try {
      const result = await createRun(projId, {
        mode,
        num_agents: numAgents,
        num_rounds: numRounds,
        debate_style: debateStyle,
        critique_strength: critiqueStrength,
      })
      navigate(`/run/${result.run_id}`)
    } catch (e) {
      alert('Failed to launch: ' + e.message)
      setLaunching(false)
    }
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
              className="card"
              style={{
                cursor: 'pointer',
                borderColor: mode === m.value ? 'var(--accent)' : undefined,
                boxShadow: mode === m.value ? 'var(--shadow-glow)' : undefined,
              }}
              onClick={() => setMode(m.value)}>
              <div className="card-title">{m.label}</div>
              <p className="text-sm text-muted mt-2">{m.desc}</p>
            </div>
          ))}
        </div>
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
            <label className="form-label">Number of Rounds</label>
            <input className="form-input" type="number" min={2} max={20}
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
