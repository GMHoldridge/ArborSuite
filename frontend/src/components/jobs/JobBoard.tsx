import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { Job, Client } from '../../types/index'

const STATUSES = ['all', 'quoted', 'scheduled', 'in_progress', 'done', 'invoiced', 'paid'] as const
type StatusFilter = (typeof STATUSES)[number]

const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  quoted: 'Quoted',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  done: 'Done',
  invoiced: 'Invoiced',
  paid: 'Paid',
}

const STATUS_COLORS: Record<string, string> = {
  quoted: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-amber-100 text-amber-800',
  done: 'bg-green-100 text-green-800',
  invoiced: 'bg-orange-100 text-orange-800',
  paid: 'bg-emerald-100 text-emerald-800',
}

const WEATHER_DOT: Record<string, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  red: 'bg-red-500',
}

export default function JobBoard() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newJob, setNewJob] = useState({ title: '', client_id: '', scheduled_date: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<Job[]>('/jobs'),
      api.get<Client[]>('/clients'),
    ])
      .then(([j, c]) => {
        setJobs(j)
        setClients(c)
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter)

  const grouped = filtered.reduce<Record<string, Job[]>>((acc, job) => {
    const key = job.status
    if (!acc[key]) acc[key] = []
    acc[key].push(job)
    return acc
  }, {})

  async function handleCreate() {
    if (!newJob.title.trim()) return
    setCreating(true)
    try {
      const created = await api.post<Job>('/jobs', {
        title: newJob.title.trim(),
        client_id: newJob.client_id ? Number(newJob.client_id) : null,
        scheduled_date: newJob.scheduled_date || null,
      })
      setJobs((prev) => [...prev, created])
      setShowCreate(false)
      setNewJob({ title: '', client_id: '', scheduled_date: '' })
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-[#228B22] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-none">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
              filter === s
                ? 'bg-[#228B22] text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {STATUS_LABELS[s]}
            {s !== 'all' && (
              <span className="ml-1.5 text-xs opacity-70">
                {jobs.filter((j) => j.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Job cards grouped by status */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <p className="text-lg">No jobs found</p>
          <p className="text-sm mt-1">Tap + to create one</p>
        </div>
      ) : (
        Object.entries(grouped).map(([status, statusJobs]) => (
          <div key={status} className="mb-6">
            {filter === 'all' && (
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {STATUS_LABELS[status]} ({statusJobs.length})
              </h2>
            )}
            <div className="space-y-2">
              {statusJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors min-h-[48px]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {job.client_name || 'No client'}
                      </p>
                      {job.scheduled_date && (
                        <p className="text-xs text-gray-400 mt-1">{job.scheduled_date}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {job.weather_status && (
                        <span
                          className={`w-3 h-3 rounded-full ${WEATHER_DOT[job.weather_status] || 'bg-gray-300'}`}
                          title={`Weather: ${job.weather_status}`}
                        />
                      )}
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {STATUS_LABELS[job.status]}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-[#228B22] text-white rounded-full shadow-lg flex items-center justify-center text-2xl active:bg-[#1a6b1a] transition-colors z-10"
        aria-label="Create new job"
      >
        +
      </button>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-[slideUp_0.2s_ease-out]">
            <h2 className="text-lg font-bold text-gray-900 mb-4">New Job</h2>

            <label className="block mb-3">
              <span className="text-sm font-medium text-gray-700">Title *</span>
              <input
                type="text"
                value={newJob.title}
                onChange={(e) => setNewJob((p) => ({ ...p, title: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22] focus:border-transparent"
                placeholder="e.g. Oak removal - 123 Main St"
              />
            </label>

            <label className="block mb-3">
              <span className="text-sm font-medium text-gray-700">Client</span>
              <select
                value={newJob.client_id}
                onChange={(e) => setNewJob((p) => ({ ...p, client_id: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22] focus:border-transparent bg-white"
              >
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block mb-5">
              <span className="text-sm font-medium text-gray-700">Scheduled Date</span>
              <input
                type="date"
                value={newJob.scheduled_date}
                onChange={(e) => setNewJob((p) => ({ ...p, scheduled_date: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22] focus:border-transparent"
              />
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreate(false)
                  setNewJob({ title: '', client_id: '', scheduled_date: '' })
                }}
                className="flex-1 py-3 rounded-lg border border-gray-300 font-medium text-gray-600 active:bg-gray-50 min-h-[48px]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newJob.title.trim()}
                className="flex-1 py-3 rounded-lg bg-[#228B22] text-white font-medium disabled:opacity-50 active:bg-[#1a6b1a] min-h-[48px]"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
