import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getActiveJobs } from '../api'
import { ArrowRight } from 'lucide-react'

const POLL_INTERVAL = 5000

export default function GlobalActiveTaskBar() {
  const [activeJobs, setActiveJobs] = useState({ runs: [], auto_research_jobs: [], total_active: 0 })
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let mounted = true
    const timer = setInterval(async () => {
      try {
        const data = await getActiveJobs()
        if (mounted) setActiveJobs(data)
      } catch (e) {
        console.error("Failed to fetch active jobs", e)
      }
    }, POLL_INTERVAL)
    
    getActiveJobs()
      .then(data => { if (mounted) setActiveJobs(data) })
      .catch(() => {})

    return () => { mounted = false; clearInterval(timer) }
  }, [])

  if (activeJobs.total_active === 0) return null

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
    <div className="global-active-bar animate-slide-up" onClick={handleLink}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleLink()}
      aria-label={`Active job: ${mainJob.topic || mainJob.id}. Click to view.`}>
      <div className="flex items-center gap-4 w-full" style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px' }}>
        <div className="active-pulse"></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
            {mainJob.topic ? 'Auto-Research Active' : 'Simulation Running'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--on-surface)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {mainJob.topic || mainJob.id.slice(0, 8)}
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="loading-bar-mini">
            <div className="loading-bar-fill-animated"></div>
          </div>
          <div className="btn btn-ghost btn-sm" style={{ color: 'var(--primary)' }}>
            View Live {activeJobs.total_active > 1 ? `(${activeJobs.total_active})` : ''} <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </div>
  )
}
