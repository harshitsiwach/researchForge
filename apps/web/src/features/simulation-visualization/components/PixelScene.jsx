import React, { useState } from 'react';
import { useVizStore } from '../store/visualizationStore';
import AgentSprite from './AgentSprite';
import DebateZone from './DebateZone';
import TimelineFeed from './TimelineFeed';

export default function PixelScene({ runId }) {
  const { status, agents } = useVizStore();
  const [selectedAgent, setSelectedAgent] = useState(null);

  const allAgents = Object.values(agents);
  const systemAgent = allAgents.find(a => a.id === 'system');
  const deskAgents = allAgents.filter(a => a.id !== 'system' && a.location !== 'debate');
  const debateAgents = allAgents.filter(a => a.location === 'debate');

  if (status === 'idle' || status === 'connecting') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)', gap: 16 }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em' }}>INITIALIZING_LAB_VISUALIZATION...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 24, height: '100%', animation: 'fadeIn 0.2s ease-out' }}>

      {/* ── Main Scene ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--surface-container-highest)',
        backgroundImage: `
          linear-gradient(var(--outline-variant) 1px, transparent 1px),
          linear-gradient(90deg, var(--outline-variant) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        border: '4px solid var(--ink-black)', padding: 32,
        position: 'relative',
      }}>
        {/* Header Overlay */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 20, marginBottom: 20, borderBottom: '2px solid var(--outline-variant)', zIndex: 10 }}>
          <div>
            <div style={{ color: 'var(--primary)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', marginBottom: '4px', fontFamily: 'var(--font-label)' }}>LAB_ENVIRONMENT_LIVE</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0, fontFamily: 'var(--font-headline)', color: 'var(--on-surface)', textTransform: 'uppercase' }}>Living Lab</h2>
            <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge-dot" style={{ color: status === 'streaming' ? 'var(--secondary)' : 'var(--primary)', animation: status === 'streaming' ? 'pulse 2s infinite' : 'none' }} />
              <span style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>STATUS: {status}</span>
            </div>
          </div>

          {systemAgent && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>CORE_SYSTEM</span>
              <AgentSprite agentId="system" agent={systemAgent} onClick={setSelectedAgent} />
            </div>
          )}
        </div>

        {/* Debate Zone */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: '16px 0', zIndex: 5 }}>
          <DebateZone agents={debateAgents} onAgentClick={setSelectedAgent} />
        </div>

        {/* Research Desks */}
        <div style={{ paddingTop: 24, borderTop: '2px solid var(--outline-variant)', position: 'relative', background: 'var(--surface-container)', margin: '0 -32px -32px', padding: '24px 32px' }}>
          <div style={{ position: 'absolute', top: 8, right: 32, fontSize: 9, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>RESEARCH_DESKS_SECTOR</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, minHeight: 100, alignItems: 'flex-end' }}>
            {deskAgents.length > 0 ? (
              deskAgents.map(ag => <AgentSprite key={ag.id} agentId={ag.id} agent={ag} onClick={setSelectedAgent} />)
            ) : (
              <div style={{ color: 'var(--on-surface-variant)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>ALL_UNITS_DEPLOYED_TO_DEBATE</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right Sidebar ── */}
      <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Agent Inspector */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '2px solid var(--outline-variant)', background: 'var(--surface-container-high)' }}>
            <div style={{ color: 'var(--primary)', fontSize: '9px', fontWeight: 700, marginBottom: '4px', fontFamily: 'var(--font-label)' }}>UNIT_INSPECTOR</div>
            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-headline)', textTransform: 'uppercase' }}>Subject Analysis</span>
          </div>
          <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
            {selectedAgent ? (
              <div className="animate-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 20, marginBottom: 20, borderBottom: '2px solid var(--outline-variant)' }}>
                  <div style={{ width: 52, height: 52, background: 'var(--surface-container-highest)', border: '2px solid var(--outline)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    {selectedAgent.id === 'system' ? '⬡' : '🤖'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--on-surface)', fontSize: 16 }}>{selectedAgent.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--primary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{selectedAgent.role}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: 'var(--font-label)' }}>CURRENT_STATE</div>
                  <span className={`badge badge-${selectedAgent.state === 'failed' ? 'failed' : selectedAgent.state === 'completed' ? 'completed' : 'running'}`}>
                    <span className="badge-dot" />
                    {selectedAgent.state.toUpperCase()}
                  </span>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: 'var(--font-label)' }}>NEURAL_OUTPUT</div>
                  <div style={{ background: 'var(--ink-black)', padding: 16, fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: 1.6, border: '2px solid var(--outline-variant)' }}>
                    <span style={{ color: 'var(--primary)', fontSize: '18px', marginRight: '4px' }}>"</span>
                    {selectedAgent.message || 'IDLE_STATE: AWAITING_INPUT'}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: 'var(--font-label)' }}>SECTOR</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--on-surface)' }}>
                    📍 AREA_{selectedAgent.location?.toUpperCase() || 'UNKNOWN'}
                  </div>
                </div>

                <button onClick={() => setSelectedAgent(null)} className="btn btn-ghost btn-sm w-full" style={{ marginTop: 12, border: '2px solid var(--outline-variant)', fontSize: '10px' }}>
                  DISCONNECT_FROM_UNIT
                </button>
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>◌</div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', maxWidth: '200px' }}>SELECT_AGENT_FOR_INSPECTION</div>
              </div>
            )}
          </div>
        </div>

        {/* Activity Log */}
        <div className="card" style={{ height: '300px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--outline-variant)', background: 'var(--surface-container-high)' }}>
            <div style={{ color: 'var(--primary)', fontSize: '9px', fontWeight: 700, marginBottom: '4px', fontFamily: 'var(--font-label)' }}>EVENT_LOG</div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Activity Stream</span>
          </div>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <TimelineFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
