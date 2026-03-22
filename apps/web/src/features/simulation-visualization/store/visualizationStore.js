import { create } from 'zustand'

export const useVizStore = create((set, get) => ({
  status: 'idle', // idle, connecting, streaming, finished, error
  runId: null,
  simulationId: null,
  
  // State maps
  agents: {}, // { agentId: { id, role, name, state, message, location } }
  timeline: [], // chronological events
  debateStats: { active: false, scenariosCount: 0, round: 0 },
  
  // SSE Connection
  eventSource: null,

  connect: (runId) => {
    const existing = get().eventSource;
    if (existing) {
      existing.close();
    }

    set({ 
      status: 'connecting', 
      runId, 
      agents: {}, 
      timeline: [], 
      debateStats: { active: false, scenariosCount: 0, round: 0 } 
    });

    const url = `/api/runs/${runId}/events`;
    const es = new EventSource(url);

    es.onopen = () => set({ status: 'streaming' });

    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data);
        get().handleEvent(evt);
      } catch (err) {
        console.error("Failed to parse event", err);
      }
    };

    es.onerror = (err) => {
      console.error("SSE Error", err);
      es.close();
      set({ status: 'error', eventSource: null });
    };

    set({ eventSource: es });
  },

  disconnect: () => {
    const es = get().eventSource;
    if (es) {
      es.close();
      set({ eventSource: null, status: 'idle' });
    }
  },

  handleEvent: (evt) => {
    // End of stream signal
    if (evt.type === 'stream_end') {
      const es = get().eventSource;
      if (es) es.close();
      set({ status: 'finished', eventSource: null });
      return;
    }

    // Add to timeline
    set((state) => ({
      timeline: [...state.timeline, evt]
    }));

    // Process specific event types
    switch (evt.type) {
      case 'simulation_started':
        set({ simulationId: evt.simulationId });
        break;

      case 'agent_spawned':
        set((state) => ({
          agents: {
            ...state.agents,
            [evt.agentId]: {
              id: evt.agentId,
              role: evt.agentRole,
              name: evt.agentName,
              state: evt.state || 'idle',
              message: '',
              location: 'intake'
            }
          }
        }));
        break;

      case 'agent_state_changed':
        // The python backend emits 'system' role state changes too,
        // we can treat system as a special agent or ignore.
        set((state) => {
          const agents = { ...state.agents };
          
          if (evt.agentId && agents[evt.agentId]) {
            agents[evt.agentId].state = evt.state;
            if (evt.message) agents[evt.agentId].message = evt.message;
          } else if (evt.agentRole === 'system') {
            agents['system'] = {
              id: 'system',
              role: 'System',
              name: 'Orchestrator',
              state: evt.state,
              message: evt.message,
              location: 'control'
            };
          }
          return { agents };
        });
        break;

      case 'agent_debate_started':
        set((state) => {
          const agents = { ...state.agents };
          // Move all normal agents to the debate zone
          Object.keys(agents).forEach(id => {
            if (id !== 'system') {
              agents[id].location = 'debate';
              agents[id].state = 'debating';
              agents[id].message = evt.message || 'Brainstorming scenarios...';
            }
          });
          return { agents, debateStats: { active: true, scenariosCount: 0, round: 1 } };
        });
        break;

      case 'agent_debate_finished':
        set((state) => {
          const agents = { ...state.agents };
          // Move them out of debate
          Object.keys(agents).forEach(id => {
            if (id !== 'system') {
              agents[id].location = 'desk';
              agents[id].state = 'idle';
              agents[id].message = 'Analysis complete.';
            }
          });
          return { agents, debateStats: { active: false, scenariosCount: evt.scenariosCount || 0, round: 0 } };
        });
        break;

      case 'simulation_finished':
      case 'artifact_created':
        set((state) => {
          const agents = { ...state.agents };
          if (agents['system']) {
            agents['system'].state = 'completed';
            agents['system'].message = 'Simulation output generated successfully.';
          }
          return { agents };
        });
        break;
        
      default:
        break;
    }
  }
}));
