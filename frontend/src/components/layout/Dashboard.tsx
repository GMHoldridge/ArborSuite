import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { DashboardData } from '../../types/index'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  quoted: { label: 'Quoted', color: 'bg-yellow-100 text-yellow-800' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', color: 'bg-orange-100 text-orange-800' },
  done: { label: 'Done', color: 'bg-green-100 text-green-800' },
  invoiced: { label: 'Invoiced', color: 'bg-purple-100 text-purple-800' },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-800' },
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<DashboardData>('/dashboard')
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#228B22] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="px-4 py-3 text-red-700 bg-red-50 border border-red-200 rounded-xl text-sm">
          Failed to load dashboard: {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-4 space-y-5">
      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => navigate('/assess')}
          className="flex flex-col items-center gap-1.5 p-3 bg-[#228B22] text-white rounded-xl shadow-sm active:scale-95 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs font-medium">New Assess</span>
        </button>
        <button
          onClick={() => navigate('/expenses/new')}
          className="flex flex-col items-center gap-1.5 p-3 bg-white text-gray-700 border border-gray-200 rounded-xl shadow-sm active:scale-95 transition-transform"
        >
          <svg className="w-6 h-6 text-[#228B22]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
          <span className="text-xs font-medium">Log Expense</span>
        </button>
        <button
          onClick={() => navigate('/clients')}
          className="flex flex-col items-center gap-1.5 p-3 bg-white text-gray-700 border border-gray-200 rounded-xl shadow-sm active:scale-95 transition-transform"
        >
          <svg className="w-6 h-6 text-[#228B22]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span className="text-xs font-medium">Add Client</span>
        </button>
      </div>

      {/* Job counts by status */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Jobs</h2>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(data.job_counts).map(([status, count]) => {
            const meta = STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
            return (
              <Link
                key={status}
                to={`/jobs?status=${status}`}
                className={`flex flex-col items-center p-3 rounded-xl ${meta.color} active:opacity-80 transition-opacity`}
              >
                <span className="text-2xl font-bold">{count}</span>
                <span className="text-[11px] font-medium">{meta.label}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Financials */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">This Month</h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-600">Revenue</span>
            <span className="text-sm font-semibold text-green-700">{formatCurrency(data.month_revenue)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-600">Expenses</span>
            <span className="text-sm font-semibold text-red-600">{formatCurrency(data.month_expenses)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-600">Profit</span>
            <span className={`text-sm font-bold ${data.month_profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {formatCurrency(data.month_profit)}
            </span>
          </div>
        </div>
      </section>

      {/* Unpaid invoices */}
      {data.unpaid_invoices.count > 0 && (
        <Link
          to="/invoices"
          className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl active:opacity-80 transition-opacity"
        >
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {data.unpaid_invoices.count} Unpaid Invoice{data.unpaid_invoices.count !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Total outstanding</p>
          </div>
          <span className="text-lg font-bold text-amber-800">
            {formatCurrency(data.unpaid_invoices.total)}
          </span>
        </Link>
      )}

      {/* Upcoming jobs */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Upcoming Jobs</h2>
        {data.upcoming_jobs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No upcoming jobs scheduled</p>
        ) : (
          <div className="space-y-2">
            {data.upcoming_jobs.map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 shadow-sm active:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{job.client}</p>
                </div>
                <span className="ml-3 text-xs font-medium text-[#228B22] whitespace-nowrap">
                  {new Date(job.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
