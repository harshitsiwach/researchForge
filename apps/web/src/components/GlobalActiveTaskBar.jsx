import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getActiveJobs } from '../api'

export default function GlobalActiveTaskBar() {
  const [activeJobs, setActiveJobs] = useState({ runs: [], auto_research_jobs: [], total_active: 0 })
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const data = await getActiveJobs()
        setActiveJobs(data)
      } catch (e) {
        console.error("Failed to fetch active jobs", e)
      }
    }, 5000)
    
    // Initial fetch
    getActiveJobs().then(setActiveJobs).catch(() => {})

    return () => clearInterval(timer)
  }, [])

  if (activeJobs.total_active === 0) return null

  // Pick the most recent/relevant job to show in the bar
  const mainJob = activeJobs.auto_research_jobs[0] || activeJobs.runs[0]
  if (!mainJob) return null

  const handleLink = () => {
    if (activeJobs.auto_research_jobs.length > 0) {
      const job = activeJobs.auto_research_jobs[0]
      navigate(`/auto_research/${job.id}`)
    } else {
      const run = activeJobs.runs[0]
      navigate(`/run/${run.id}`)
    }
  }

  return (
    <div className="global-active-bar animate-slide-up" onClick={handleLink}>
      <div className="flex items-center gap-4 w-full max-w-7xl mx-auto px-6">
        <div className="active-pulse"></div>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: '10px', color: 'var(--text-neon)', fontWeight: 700, letterSpacing: '0.05em' }}>
            {mainJob.topic ? 'AUTO-RESEARCH ACTIVE' : 'SIMULATION RUNNING'}
          </div>
          <div style={{ fontSize: '13px', color: '#fff', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {mainJob.topic || `Sequence ID: ${mainJob.id.slice(0, 8)}`}
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="loading-bar-mini">
            <div className="loading-bar-fill-animated"></div>
          </div>
          <div className="btn btn-ghost btn-sm" style={{ border: '1px solid rgba(0, 255, 163, 0.2)', color: 'var(--text-neon)' }}>
            View Live {activeJobs.total_active > 1 ? `(${activeJobs.total_active})` : ''} →
          </div>
        </div>
      </div>
    </div>
  )
}
