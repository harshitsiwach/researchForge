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
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#475569', fontSize: 15,
      }}>
        <div className="spinner" style={{ marginRight: 12 }} /> Connecting to simulation event stream…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>

      {/* ── Main Scene ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(10,14,26,1) 0%, rgba(15,23,42,0.9) 100%)',
        border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16, padding: 24,
        position: 'relative', boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid rgba(99,102,241,0.1)',
        }}>
          <div>
            <h2 style={{
              fontSize: 22, fontWeight: 700, margin: 0,
              background: 'linear-gradient(135deg, #818cf8, #34d399)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              🧪 Living Lab
            </h2>
            <div style={{ fontSize: 13, color: '#475569', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: status === 'streaming' ? '#34d399' : status === 'finished' ? '#6366f1' : '#f87171',
                boxShadow: status === 'streaming' ? '0 0 8px rgba(52,211,153,0.5)' : 'none',
                animation: status === 'streaming' ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }} />
              <span style={{ textTransform: 'uppercase', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
                {status}
              </span>
            </div>
          </div>

          {systemAgent && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>Orchestrator</span>
              <AgentSprite agentId="system" agent={systemAgent} onClick={setSelectedAgent} />
            </div>
          )}
        </div>

        {/* Debate Zone */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: '8px 0' }}>
          <DebateZone agents={debateAgents} onAgentClick={setSelectedAgent} />
        </div>

        {/* Research Desks */}
        <div style={{ paddingTop: 16, borderTop: '1px solid rgba(99,102,241,0.1)', position: 'relative' }}>
          <span style={{ position: 'absolute', bottom: 4, right: 8, fontSize: 10, color: '#334155' }}>Research Desks</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, minHeight: 90, paddingLeft: 8, alignItems: 'flex-end' }}>
            {deskAgents.length > 0 ? (
              deskAgents.map(ag => <AgentSprite key={ag.id} agentId={ag.id} agent={ag} onClick={setSelectedAgent} />)
            ) : (
              <span style={{ color: '#334155', fontSize: 12 }}>All agents are in the debate room</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Right Sidebar ── */}
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Inspector */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>🕵️ Agent Inspector</span>
          </div>
          <div style={{ flex: 1, padding: 16, overflowY: 'auto', fontSize: 13, color: '#94a3b8' }}>
            {selectedAgent ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
                  <div style={{ fontSize: 28, background: 'rgba(15,23,42,0.8)', padding: 8, borderRadius: 8 }}>
                    {selectedAgent.id === 'system' ? '⚙️' : '🤖'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>{selectedAgent.name}</div>
                    <div style={{ fontSize: 11, color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>{selectedAgent.role}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>State</div>
                  <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '3px 10px', borderRadius: 6, fontSize: 12 }}>
                    {selectedAgent.state}
                  </span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Last Message</div>
                  <div style={{ background: 'rgba(15,23,42,0.6)', padding: 10, borderRadius: 8, fontStyle: 'italic', lineHeight: 1.5 }}>
                    "{selectedAgent.message || 'Waiting for assignment…'}"
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Location</div>
                  <span style={{ fontSize: 12 }}>📍 {selectedAgent.location || 'unknown'}</span>
                </div>

                <div
                  onClick={() => setSelectedAgent(null)}
                  style={{ textAlign: 'center', fontSize: 11, color: '#475569', cursor: 'pointer', paddingTop: 12, borderTop: '1px solid rgba(99,102,241,0.07)' }}
                >
                  [ Close Inspector ]
                </div>
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 16, color: '#334155' }}>
                Click any agent to inspect their role, state, and current thoughts.
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>⏱️ Activity Log</span>
          </div>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <TimelineFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
