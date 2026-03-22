import React, { useEffect, useRef } from 'react';
import { useVizStore } from '../store/visualizationStore';

const eventIcons = {
  simulation_started:    '🚀',
  agent_spawned:         '👤',
  simulation_progress:   '🔄',
  agent_state_changed:   '⚙️',
  agent_debate_started:  '🗣️',
  agent_debate_finished: '✅',
  artifact_created:      '📄',
  simulation_finished:   '🏁',
};

function formatEvent(evt) {
  switch (evt.type) {
    case 'simulation_started':    return `Simulation started: "${(evt.question || '').slice(0, 40)}…"`;
    case 'agent_spawned':         return `Agent spawned: ${evt.agentRole}`;
    case 'simulation_progress':   return `Phase: ${evt.phase}`;
    case 'agent_state_changed':   return evt.message || `State → ${evt.state}`;
    case 'agent_debate_started':  return evt.message || 'Debate started';
    case 'agent_debate_finished': return `Debate finished — ${evt.scenariosCount} scenarios`;
    case 'artifact_created':      return `Artifact: ${evt.artifactId}`;
    case 'simulation_finished':   return 'Simulation completed';
    default:                      return evt.type;
  }
}

export default function TimelineFeed() {
  const { timeline } = useVizStore();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timeline.length]);

  return (
    <div style={{
      position: 'absolute', inset: 8, overflowY: 'auto',
      paddingRight: 4, fontSize: 13,
    }}>
      {timeline.map((evt) => {
        const t = new Date(evt.timestamp * 1000);
        const ts = t.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return (
          <div key={evt.eventId} style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            padding: '5px 0', borderBottom: '1px solid rgba(99,102,241,0.07)',
          }}>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#475569', minWidth: 52, paddingTop: 1 }}>{ts}</span>
            <span style={{ fontSize: 14 }}>{eventIcons[evt.type] || '⏺'}</span>
            <span style={{ color: '#94a3b8', lineHeight: 1.4 }}>{formatEvent(evt)}</span>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
