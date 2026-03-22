import React from 'react';
import AgentSprite from './AgentSprite';
import { useVizStore } from '../store/visualizationStore';

export default function DebateZone({ agents, onAgentClick }) {
  const { debateStats } = useVizStore();

  const isEmpty = !debateStats.active && agents.length === 0;

  return (
    <div style={{
      width: '100%', minHeight: 220, position: 'relative',
      border: isEmpty ? '2px dashed rgba(99,102,241,0.15)' : '2px solid rgba(99,102,241,0.25)',
      borderRadius: 14, padding: 20,
      background: isEmpty ? 'transparent' : 'rgba(15, 23, 42, 0.5)',
      display: 'flex', flexDirection: 'column',
      boxShadow: debateStats.active ? 'inset 0 0 30px rgba(168, 85, 247, 0.08)' : 'none',
      transition: 'all 0.5s ease',
    }}>
      {/* Header label */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        padding: '4px 14px', fontSize: 12, fontWeight: 600,
        background: debateStats.active ? 'rgba(168, 85, 247, 0.3)' : 'rgba(30, 41, 59, 0.8)',
        borderBottomRightRadius: 10, color: debateStats.active ? '#c4b5fd' : '#64748b',
      }}>
        🏛️ {debateStats.active ? `Debate Room (Round ${debateStats.round})` : 'Debate Room (Empty)'}
      </div>

      {debateStats.scenariosCount > 0 && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          padding: '4px 14px', fontSize: 12, fontWeight: 600,
          background: 'rgba(99, 102, 241, 0.2)', borderBottomLeftRadius: 10,
          color: '#818cf8',
        }}>
          ✨ {debateStats.scenariosCount} Scenarios Generated
        </div>
      )}

      {/* Agents */}
      <div style={{
        flex: 1, marginTop: 28,
        display: 'flex', flexWrap: 'wrap', gap: 16,
        alignItems: 'center', justifyContent: 'center',
      }}>
        {isEmpty ? (
          <span style={{ color: '#475569', fontSize: 14 }}>Agents will gather here during debate phases</span>
        ) : (
          agents.map(ag => (
            <AgentSprite key={ag.id} agentId={ag.id} agent={ag} onClick={onAgentClick} />
          ))
        )}
      </div>
    </div>
  );
}
