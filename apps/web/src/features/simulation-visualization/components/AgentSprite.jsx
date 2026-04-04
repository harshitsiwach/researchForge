import React from 'react';

const stateConfig = {
  idle:      { emoji: '⬡', color: 'var(--on-surface-variant-muted)', glow: 'transparent' },
  spawning:  { emoji: '⬢', color: 'var(--primary)', glow: 'var(--accent-glow)' },
  reading:   { emoji: '👁️‍🗨️', color: 'var(--tertiary)', glow: 'rgba(125, 82, 96, 0.3)' },
  thinking:  { emoji: '🧠', color: 'var(--secondary)', glow: 'rgba(98, 91, 113, 0.3)' },
  writing:   { emoji: '✍️', color: 'var(--primary)', glow: 'var(--accent-glow)' },
  debating:  { emoji: '💬', color: 'var(--tertiary)', glow: 'rgba(125, 82, 96, 0.4)' },
  waiting:   { emoji: '⏳', color: 'var(--on-surface-variant-muted)', glow: 'transparent' },
  reviewing: { emoji: '🔬', color: 'var(--warning)', glow: 'rgba(138, 88, 0, 0.2)' },
  scoring:   { emoji: '📊', color: 'var(--success)', glow: 'rgba(56, 106, 32, 0.2)' },
  completed: { emoji: '✓', color: 'var(--success)', glow: 'rgba(56, 106, 32, 0.3)' },
  failed:    { emoji: '×', color: 'var(--error)', glow: 'rgba(179, 38, 30, 0.3)' },
};

export default function AgentSprite({ agentId, agent, onClick }) {
  const { name, state, message } = agent;
  const cfg = stateConfig[state] || stateConfig.idle;
  const isSystem = agentId === 'system';

  const isActive = ['reading', 'thinking', 'writing', 'debating'].includes(state);

  return (
    <div
      onClick={() => onClick && onClick(agent)}
      style={{
        width: 80, minHeight: 100, margin: '0 8px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        cursor: 'pointer', position: 'relative',
        transition: 'var(--transition-smooth)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-6px) scale(1.05)';
        e.currentTarget.style.zIndex = 100;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.zIndex = 1;
      }}
    >
      {/* ── Speech Bubble (Digital Readout) ── */}
      {message && (
        <div style={{
          position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 12, padding: '8px 12px', minWidth: 140, maxWidth: 200,
          background: 'var(--surface-container)', border: `1px solid ${isActive ? 'var(--primary)' : 'var(--outline-variant)'}`,
          borderRadius: 'var(--radius-md)', fontSize: '11px', color: 'var(--on-surface)',
          fontFamily: 'var(--font-mono)', lineHeight: 1.4,
          zIndex: 200, boxShadow: isActive ? 'var(--elevation-2)' : 'var(--elevation-3)',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ fontSize: '9px', color: 'var(--text-neon)', marginBottom: '4px', opacity: 0.7 }}>READOUT_V01</div>
          {message.length > 80 ? message.slice(0, 80) + '…' : message}
          
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            borderWidth: '6px 6px 0 6px', borderStyle: 'solid',
            borderColor: `${isActive ? 'var(--primary)' : 'var(--surface-container)'} transparent transparent transparent`,
          }} />
        </div>
      )}

      {/* ── Hologram Pedestal Effect ── */}
      <div style={{
        position: 'absolute', bottom: 20, width: 44, height: 12,
        background: 'radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)',
        borderRadius: '50%', opacity: isActive ? 1 : 0.3,
      }}></div>

      {/* ── Avatar Node ── */}
      <div style={{
        width: 52, height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '50%', fontSize: 22,
        background: isSystem ? 'var(--surface-container-highest)' : 'var(--surface-container)',
        border: `2px solid ${isActive ? cfg.color : 'var(--outline-variant)'}`,
        boxShadow: `0 0 15px ${cfg.glow}`,
        animation: isActive ? 'glowPulse 2s ease-in-out infinite' : 'none',
        zIndex: 5,
        color: isSystem ? 'var(--text-neon)' : cfg.color,
      }}>
        {isSystem ? '⬡' : cfg.emoji}
      </div>

      {/* ── Data Tag (Name) ── */}
      <div style={{
        marginTop: 10, fontSize: '10px', fontFamily: 'var(--font-mono)',
        fontWeight: 600, color: 'var(--on-surface-variant)',
        background: 'var(--surface-container-highest)', padding: '2px 8px', borderRadius: '4px',
        border: '1px solid var(--outline-variant)', maxWidth: 80,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {name.toUpperCase()}
      </div>
    </div>
  );
}
