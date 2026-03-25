/* API client for ResearchForge backend */

const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Workspaces
export const listWorkspaces = () => request('/workspaces');
export const createWorkspace = (name) => request('/workspaces', { method: 'POST', body: JSON.stringify({ name }) });
export const getWorkspace = (id) => request(`/workspaces/${id}`);

// Projects
export const createProject = (wsId, name, question) =>
  request(`/workspaces/${wsId}/projects`, { method: 'POST', body: JSON.stringify({ name, question }) });
export const getProject = (wsId, projId) => request(`/workspaces/${wsId}/projects/${projId}`);

// Seeds
export const uploadSeed = async (projId, file) => {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/projects/${projId}/seeds`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
};
export const listSeeds = (projId) => request(`/projects/${projId}/seeds`);
export const generateSeed = (projId) => request(`/projects/${projId}/seeds/generate`, { method: 'POST' });

// Runs
export const createRun = (projId, config) =>
  request(`/projects/${projId}/runs`, { method: 'POST', body: JSON.stringify(config) });
export const getRun = (runId) => request(`/runs/${runId}`);
export const listRuns = (projId) => request(`/projects/${projId}/runs`);
export const stopRun = (runId) => request(`/runs/${runId}/stop`, { method: 'POST' });

// Reports
export const getReport = (runId) => request(`/runs/${runId}/report`);

// Compare
export const compareRuns = (projId, baselineRunId, challengerRunId) =>
  request(`/projects/${projId}/compare`, {
    method: 'POST',
    body: JSON.stringify({ baseline_run_id: baselineRunId, challenger_run_id: challengerRunId }),
  });
export const promoteConfig = (projId, runId) =>
  request(`/projects/${projId}/promote/${runId}`, { method: 'POST' });

// Settings
export const getSettings = () => request('/settings');
export const updateSettings = (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) });

// Tools
export const listTools = () => request('/tools');
export const toggleTool = (toolId) => request(`/tools/${toolId}/toggle`, { method: 'PUT' });
export const configureTool = (toolId, config) =>
  request(`/tools/${toolId}/config`, { method: 'PUT', body: JSON.stringify({ config }) });
export const testTool = (toolId, query) =>
  request(`/tools/${toolId}/test`, { method: 'POST', body: JSON.stringify({ query }) });

// Feeds
export const getFeedTypes = () => request('/feeds/sources');
export const getProjectFeeds = (projId) => request(`/projects/${projId}/feeds`);
export const configureProjectFeeds = (projId, sources) =>
  request(`/projects/${projId}/feeds`, { method: 'POST', body: JSON.stringify({ sources }) });
export const testFeedSource = (source) =>
  request('/feeds/test', { method: 'POST', body: JSON.stringify(source) });

// Auto-Researcher
export const createAutoResearch = (projId, topic) =>
  request(`/projects/${projId}/auto_research`, { method: 'POST', body: JSON.stringify({ topic }) });
export const getAutoResearchJob = (jobId) => request(`/auto_research/${jobId}`);
export const listAutoResearchJobs = (projId) => request(`/projects/${projId}/auto_research`);
export const stopAutoResearchJob = (jobId) => request(`/auto_research/${jobId}/stop`, { method: 'POST' });

// System
export const getActiveJobs = () => request('/system/active_jobs');
