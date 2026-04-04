import { useState, useEffect } from 'react'
import { getSettings, updateSettings } from '../api'
import { toast } from '../components/Toast'
import PageLoading from '../components/PageLoading'
import { Server, Monitor, Cloud, Settings as SettingsIcon, Plug, List, Save, BookOpen, CheckCircle, XCircle } from 'lucide-react'

export default function Settings() {
  const [form, setForm] = useState({
    llm_base_url: 'http://localhost:1234/v1',
    llm_model: 'local-model',
    llm_api_key: 'not-needed',
    max_agents: '8',
    max_rounds: '10',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [models, setModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSettings()
      .then(s => {
        setForm(prev => ({ ...prev, ...s }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await updateSettings(form)
      setForm(prev => ({ ...prev, ...updated }))
      setSaved(true)
      toast.success('Settings saved')
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      toast.error('Save failed: ' + e.message)
    }
    setSaving(false)
  }

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      await updateSettings(form)
      const res = await fetch('/api/settings/test-connection', { method: 'POST' })
      const data = await res.json()
      setTestResult(data)
      if (data.connected) toast.success('Connection successful')
      else toast.error('Connection failed')
    } catch (e) {
      setTestResult({ connected: false, error: e.message })
      toast.error('Test request failed')
    }
    setTesting(false)
  }

  async function handleLoadModels() {
    setLoadingModels(true)
    try {
      await updateSettings(form)
      const res = await fetch('/api/settings/models')
      const data = await res.json()
      if (data.models) setModels(data.models)
    } catch (e) {
      toast.error('Failed to load models')
    }
    setLoadingModels(false)
  }

  const presets = [
    {
      name: 'Ollama',
      icon: Server,
      config: { llm_base_url: 'http://localhost:11434/v1', llm_model: 'llama3.2', llm_api_key: 'ollama' }
    },
    {
      name: 'LM Studio',
      icon: Monitor,
      config: { llm_base_url: 'http://localhost:1234/v1', llm_model: 'local-model', llm_api_key: 'not-needed' }
    },
    {
      name: 'OpenAI',
      icon: Cloud,
      config: { llm_base_url: 'https://api.openai.com/v1', llm_model: 'gpt-4o-mini', llm_api_key: '' }
    },
    {
      name: 'Custom',
      icon: SettingsIcon,
      config: null
    },
  ]

  if (loading) return <PageLoading message="Loading settings..." />

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Connect your local or remote LLM to power research simulations</p>
      </div>

      {/* Quick presets */}
      <div className="card mb-4">
        <div className="card-title mb-4">Quick Setup</div>
        <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {presets.map(p => {
            const Icon = p.icon
            return (
              <div key={p.name}
                className={`card preset-card ${p.config && form.llm_base_url === p.config.llm_base_url ? 'preset-card-selected' : ''}`}
                onClick={() => p.config && setForm(prev => ({ ...prev, ...p.config }))}
                role={p.config ? 'button' : undefined}
                tabIndex={p.config ? 0 : undefined}
                onKeyDown={e => p.config && e.key === 'Enter' && setForm(prev => ({ ...prev, ...p.config }))}
                aria-pressed={p.config && form.llm_base_url === p.config.llm_base_url}>
                <div style={{ marginBottom: 8, color: p.config && form.llm_base_url === p.config.llm_base_url ? 'var(--on-primary-container)' : 'var(--on-surface-variant)' }}>
                  <Icon size={28} />
                </div>
                <div className="card-title" style={{ fontSize: 14 }}>{p.name}</div>
                {p.config && (
                  <div className="text-sm text-muted mt-2" style={{ fontSize: 11 }}>
                    {p.config.llm_base_url.replace('http://', '').replace('https://', '').split('/')[0]}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* LLM Configuration */}
        <div className="card mb-4">
          <div className="card-header">
            <div className="card-title">LLM Configuration</div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleTestConnection} disabled={testing}>
              <Plug size={14} /> {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {/* Connection status */}
          {testResult && (
            <div style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              background: testResult.connected ? 'var(--success-container)' : 'var(--error-container)',
              border: `1px solid ${testResult.connected ? 'var(--success)' : 'var(--error)'}`,
            }}>
              <div className="flex items-center gap-3">
                <span style={{ color: testResult.connected ? 'var(--success)' : 'var(--error)' }}>
                  {testResult.connected ? <CheckCircle size={24} /> : <XCircle size={24} />}
                </span>
                <div>
                  <div style={{ fontWeight: 600, color: testResult.connected ? 'var(--success)' : 'var(--error)' }}>
                    {testResult.connected ? 'Connected' : 'Connection Failed'}
                  </div>
                  <div className="text-sm text-muted mt-2">
                    {testResult.connected ? (
                      <>
                        Model: <span className="font-mono">{testResult.model}</span>
                        {testResult.test_reply && <> · Reply: "{testResult.test_reply}"</>}
                        {testResult.available_models?.length > 0 && (
                          <> · {testResult.available_models.length} models available</>
                        )}
                      </>
                    ) : (
                      <span style={{ color: 'var(--error)' }}>{testResult.error}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">API Base URL</label>
            <input className="form-input" value={form.llm_base_url}
              onChange={e => setForm({ ...form, llm_base_url: e.target.value })}
              placeholder="http://localhost:1234/v1" />
            <span className="text-sm text-muted">
              Ollama: <code style={{ color: 'var(--primary)' }}>localhost:11434/v1</code> ·
              LM Studio: <code style={{ color: 'var(--primary)' }}>localhost:1234/v1</code>
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Model Name</label>
            <div className="flex gap-2">
              <input className="form-input" style={{ flex: 1 }} value={form.llm_model}
                onChange={e => setForm({ ...form, llm_model: e.target.value })}
                placeholder="llama3.2 or local-model" />
              <button type="button" className="btn btn-ghost btn-sm"
                onClick={handleLoadModels} disabled={loadingModels}>
                <List size={14} /> {loadingModels ? '...' : 'Load Models'}
              </button>
            </div>
            {models.length > 0 && (
              <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
                {models.map(m => (
                  <button key={m.id} type="button"
                    className={`btn btn-sm ${form.llm_model === m.id ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 12, padding: '4px 10px' }}
                    onClick={() => setForm({ ...form, llm_model: m.id })}>
                    {m.id}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">API Key</label>
            <input className="form-input" type="password" value={form.llm_api_key}
              onChange={e => setForm({ ...form, llm_api_key: e.target.value })}
              placeholder="not-needed for local models" />
            <span className="text-sm text-muted">Leave as "not-needed" or "ollama" for local models</span>
          </div>
        </div>

        {/* Compute Budgets */}
        <div className="card mb-4">
          <div className="card-title mb-4">Compute Budgets</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Default Max Agents</label>
              <input className="form-input" type="number" min={2} max={32}
                value={form.max_agents} onChange={e => setForm({ ...form, max_agents: e.target.value })} />
              <span className="text-sm text-muted">More agents = richer scenarios but slower & more tokens</span>
            </div>
            <div className="form-group">
              <label className="form-label">Default Max Rounds</label>
              <input className="form-input" type="number" min={2} max={50}
                value={form.max_rounds} onChange={e => setForm({ ...form, max_rounds: e.target.value })} />
              <span className="text-sm text-muted">More rounds = deeper exploration but longer runs</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="text-success text-sm" style={{
            animation: 'fadeIn 300ms ease'
          }}>Settings saved — backend will use these values for all runs</span>}
        </div>
      </form>

      {/* Help section */}
      <div className="card mt-6">
        <div className="card-title mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BookOpen size={18} /> Setup Guide</div>
        <div className="text-sm text-muted" style={{ lineHeight: 1.8 }}>
          <p><strong style={{ color: 'var(--on-surface)' }}>Using Ollama:</strong></p>
          <ol style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li>Install: <code style={{ color: 'var(--primary)' }}>brew install ollama</code></li>
            <li>Pull a model: <code style={{ color: 'var(--primary)' }}>ollama pull llama3.2</code></li>
            <li>Start: <code style={{ color: 'var(--primary)' }}>ollama serve</code></li>
            <li>Set URL above to <code style={{ color: 'var(--primary)' }}>localhost:11434/v1</code></li>
          </ol>
          <p><strong style={{ color: 'var(--on-surface)' }}>Using LM Studio:</strong></p>
          <ol style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li>Download from <a href="https://lmstudio.ai" target="_blank" style={{ color: 'var(--primary)' }}>lmstudio.ai</a></li>
            <li>Load a model and start the local server</li>
            <li>Set URL above to <code style={{ color: 'var(--primary)' }}>localhost:1234/v1</code></li>
          </ol>
          <p><strong style={{ color: 'var(--on-surface)' }}>Using OpenAI:</strong></p>
          <ol style={{ paddingLeft: 20 }}>
            <li>Set URL to <code style={{ color: 'var(--primary)' }}>api.openai.com/v1</code></li>
            <li>Enter your API key</li>
            <li>Model: <code style={{ color: 'var(--primary)' }}>gpt-4o-mini</code> (cheapest)</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
