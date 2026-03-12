import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../api/client'
import type { Job, Assessment, Quote, Invoice } from '../../types/index'

const STATUS_COLORS: Record<string, string> = {
  quoted: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-amber-100 text-amber-800',
  done: 'bg-green-100 text-green-800',
  invoiced: 'bg-orange-100 text-orange-800',
  paid: 'bg-emerald-100 text-emerald-800',
}

const STATUS_LABELS: Record<string, string> = {
  quoted: 'Quoted',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  done: 'Done',
  invoiced: 'Invoiced',
  paid: 'Paid',
}

const WEATHER_BADGE: Record<string, { bg: string; label: string }> = {
  green: { bg: 'status-green', label: 'Good' },
  yellow: { bg: 'status-yellow', label: 'Caution' },
  red: { bg: 'status-red', label: 'Danger' },
}

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  quoted: [{ label: 'Schedule Job', next: 'scheduled' }],
  scheduled: [{ label: 'Start Job', next: 'in_progress' }],
  in_progress: [{ label: 'Mark Done', next: 'done' }],
  done: [{ label: 'Create Invoice', next: 'invoiced' }],
  invoiced: [{ label: 'Mark Paid', next: 'paid' }],
  paid: [],
}

interface JobDetailResponse extends Job {
  assessment?: Assessment | null
  quote?: Quote | null
  invoice?: Invoice | null
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<JobDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingDate, setEditingDate] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    api.get<JobDetailResponse>(`/jobs/${id}`)
      .then((data) => {
        setJob(data)
        setNewDate(data.scheduled_date || '')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function changeStatus(next: string) {
    if (!job) return
    setUpdating(true)
    try {
      const updated = await api.put<JobDetailResponse>(`/jobs/${job.id}`, { status: next })
      setJob(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setUpdating(false)
    }
  }

  async function saveDate() {
    if (!job) return
    setUpdating(true)
    try {
      const updated = await api.put<JobDetailResponse>(`/jobs/${job.id}`, {
        scheduled_date: newDate || null,
      })
      setJob(updated)
      setEditingDate(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-[#228B22] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-red-600 mb-4">{error || 'Job not found'}</p>
        <button onClick={() => navigate('/jobs')} className="text-[#228B22] font-medium min-h-[48px]">
          Back to Jobs
        </button>
      </div>
    )
  }

  const weather = job.weather_status ? WEATHER_BADGE[job.weather_status] : null
  const transitions = STATUS_TRANSITIONS[job.status] || []

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/jobs')}
        className="flex items-center gap-1 text-[#228B22] font-medium mb-4 min-h-[48px]"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Jobs
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[job.status]}`}>
            {STATUS_LABELS[job.status]}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Client</span>
            <span className="font-medium text-gray-900">{job.client_name || 'None'}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500">Scheduled</span>
            {editingDate ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]"
                />
                <button
                  onClick={saveDate}
                  disabled={updating}
                  className="text-[#228B22] font-medium text-sm min-w-[48px] min-h-[36px]"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingDate(false)
                    setNewDate(job.scheduled_date || '')
                  }}
                  className="text-gray-400 text-sm min-w-[48px] min-h-[36px]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingDate(true)}
                className="font-medium text-gray-900 min-h-[36px] flex items-center gap-1"
              >
                {job.scheduled_date || 'Not set'}
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>

          {weather && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Weather</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${weather.bg}`}>
                {weather.label}
              </span>
            </div>
          )}

          {job.risk_score && (
            <div className="flex justify-between">
              <span className="text-gray-500">Risk Score</span>
              <span className="font-medium text-gray-900">{job.risk_score}</span>
            </div>
          )}
        </div>
      </div>

      {/* Linked sections */}
      <div className="space-y-3 mb-6">
        {/* Assessment */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#228B22]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium text-gray-900">Assessment</span>
            </div>
            {job.assessment ? (
              <Link
                to={`/assess/${job.assessment.id}`}
                className="text-[#228B22] font-medium text-sm min-h-[48px] flex items-center"
              >
                View
              </Link>
            ) : (
              <Link
                to={`/assess?job_id=${job.id}`}
                className="text-[#228B22] font-medium text-sm min-h-[48px] flex items-center"
              >
                Create
              </Link>
            )}
          </div>
        </div>

        {/* Quote */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#228B22]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 8v1" />
              </svg>
              <span className="font-medium text-gray-900">Quote</span>
            </div>
            {job.quote ? (
              <span className="text-sm text-gray-500">
                ${job.quote.total.toFixed(2)} - {job.quote.status}
              </span>
            ) : (
              <span className="text-sm text-gray-400">Not created</span>
            )}
          </div>
        </div>

        {/* Invoice */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#228B22]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
              <span className="font-medium text-gray-900">Invoice</span>
            </div>
            {job.invoice ? (
              <span className="text-sm text-gray-500">
                ${job.invoice.total.toFixed(2)} - {job.invoice.status}
              </span>
            ) : (
              <span className="text-sm text-gray-400">Not created</span>
            )}
          </div>
        </div>
      </div>

      {/* Status actions */}
      {transitions.length > 0 && (
        <div className="space-y-2">
          {transitions.map((t) => (
            <button
              key={t.next}
              onClick={() => changeStatus(t.next)}
              disabled={updating}
              className="w-full py-3.5 rounded-xl bg-[#228B22] text-white font-semibold text-base disabled:opacity-50 active:bg-[#1a6b1a] transition-colors min-h-[48px]"
            >
              {updating ? 'Updating...' : t.label}
            </button>
          ))}
        </div>
      )}

      {job.description && (
        <div className="mt-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
          <p className="text-gray-900 whitespace-pre-wrap">{job.description}</p>
        </div>
      )}
    </div>
  )
}
