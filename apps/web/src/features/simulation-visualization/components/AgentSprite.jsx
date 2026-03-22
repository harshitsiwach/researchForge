import React from 'react';

const stateConfig = {
  idle:      { emoji: '😴', color: 'var(--bg-card)' },
  spawning:  { emoji: '✨', color: 'var(--bg-card)' },
  reading:   { emoji: '📖', color: 'rgba(99, 102, 241, 0.25)' },
  thinking:  { emoji: '🤔', color: 'rgba(139, 92, 246, 0.25)' },
  writing:   { emoji: '✍️', color: 'rgba(20, 184, 166, 0.25)' },
  debating:  { emoji: '🗣️', color: 'rgba(168, 85, 247, 0.35)' },
  waiting:   { emoji: '⏳', color: 'var(--bg-card)' },
  reviewing: { emoji: '🔍', color: 'rgba(251, 191, 36, 0.2)' },
  scoring:   { emoji: '📊', color: 'rgba(52, 211, 153, 0.2)' },
  completed: { emoji: '✅', color: 'rgba(52, 211, 153, 0.25)' },
  failed:    { emoji: '❌', color: 'rgba(248, 113, 113, 0.25)' },
};

export default function AgentSprite({ agentId, agent, onClick }) {
  const { name, state, message } = agent;
  const cfg = stateConfig[state] || stateConfig.idle;
  const isSystem = agentId === 'system';

  return (
    <div
      onClick={() => onClick && onClick(agent)}
      title={`${name} — ${state}`}
      style={{
        width: 72, minHeight: 90, margin: '0 6px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        cursor: 'pointer', position: 'relative',
        transition: 'transform 0.4s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {/* Speech bubble */}
      {message && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 8, padding: '6px 10px', maxWidth: 160,
          background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 8, fontSize: 11, color: '#94a3b8', lineHeight: 1.3,
          whiteSpace: 'normal', wordBreak: 'break-word', zIndex: 20,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}>
          {message.length > 60 ? message.slice(0, 60) + '…' : message}
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            borderWidth: 5, borderStyle: 'solid',
            borderColor: 'rgba(15, 23, 42, 0.95) transparent transparent transparent',
          }} />
        </div>
      )}

      {/* Avatar */}
      <div style={{
        width: 48, height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 10, fontSize: 26,
        background: cfg.color,
        border: `2px solid ${state === 'debating' ? 'rgba(168, 85, 247, 0.6)' : 'rgba(99, 102, 241, 0.2)'}`,
        boxShadow: state === 'debating' ? '0 0 12px rgba(168, 85, 247, 0.3)' : 'var(--shadow-sm)',
        animation: (state === 'reading' || state === 'thinking') ? 'pulse 1.5s ease-in-out infinite' : 'none',
      }}>
        {isSystem ? '⚙️' : cfg.emoji}
      </div>

      {/* Name plate */}
      <div style={{
        marginTop: 4, fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
        background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '2px 6px',
        color: '#94a3b8', maxWidth: 72, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
      }}>
        {name}
      </div>
    </div>
  );
}
