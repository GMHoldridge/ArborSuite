import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { Client, Job } from '../../types/index'

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  })

  useEffect(() => {
    if (!id) return
    async function load() {
      try {
        const [c, j] = await Promise.all([
          api.get<Client>(`/clients/${id}`),
          api.get<Job[]>(`/clients/${id}/jobs`),
        ])
        setClient(c)
        setJobs(j)
        setForm({
          name: c.name,
          phone: c.phone || '',
          email: c.email || '',
          address: c.address || '',
          notes: c.notes || '',
        })
      } catch (err) {
        console.error('Failed to load client', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleSave() {
    if (!id || !form.name.trim()) return
    setSaving(true)
    try {
      await api.put(`/clients/${id}`, {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      })
      navigate('/clients')
    } catch (err) {
      console.error('Failed to update client', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    try {
      await api.delete(`/clients/${id}`)
      navigate('/clients')
    } catch (err) {
      console.error('Failed to delete client', err)
    }
  }

  const statusColors: Record<string, string> = {
    quoted: 'bg-gray-200 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-800',
    done: 'bg-green-100 text-green-700',
    invoiced: 'bg-purple-100 text-purple-700',
    paid: 'bg-emerald-100 text-emerald-700',
  }

  if (loading) {
    return <p className="text-gray-500 text-center py-8">Loading...</p>
  }

  if (!client) {
    return <p className="text-red-500 text-center py-8">Client not found</p>
  }

  return (
    <div className="pb-24 space-y-5">
      <button
        onClick={() => navigate('/clients')}
        className="text-[#228B22] font-medium min-h-[48px] flex items-center"
      >
        &larr; Back to Clients
      </button>

      <h1 className="text-xl font-bold">Edit Client</h1>

      {/* Form */}
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-600">Name *</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full px-4 py-3 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22]"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Phone</span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="mt-1 w-full px-4 py-3 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22]"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full px-4 py-3 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22]"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Address</span>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="mt-1 w-full px-4 py-3 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22]"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Notes</span>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="mt-1 w-full px-4 py-3 rounded-lg border border-gray-300 text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#228B22]"
          />
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !form.name.trim()}
          className="flex-1 py-3 rounded-lg bg-[#228B22] text-white text-base font-medium min-h-[48px] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={() => setShowDelete(true)}
          className="py-3 px-5 rounded-lg bg-red-600 text-white text-base font-medium min-h-[48px]"
        >
          Delete
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-5">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold">Delete Client?</h2>
            <p className="text-gray-600">
              This will permanently delete <strong>{client.name}</strong> and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 py-3 rounded-lg border border-gray-300 font-medium min-h-[48px]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-lg bg-red-600 text-white font-medium min-h-[48px]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job History */}
      <div>
        <h2 className="text-lg font-bold mb-3">Job History</h2>
        {jobs.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No jobs for this client</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="w-full text-left bg-white rounded-lg shadow p-4 active:bg-gray-50 min-h-[48px]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{job.title}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[job.status] || 'bg-gray-200'}`}
                  >
                    {job.status.replace('_', ' ')}
                  </span>
                </div>
                {job.scheduled_date && (
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(job.scheduled_date).toLocaleDateString()}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
