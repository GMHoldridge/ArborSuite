import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { Client } from '../../types/index'

export default function ClientList() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' })

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    try {
      const data = await api.get<Client[]>('/clients')
      setClients(data)
    } catch (err) {
      console.error('Failed to load clients', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAdd() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await api.post('/clients', {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
      })
      setForm({ name: '', phone: '', email: '', address: '' })
      setShowForm(false)
      await fetchClients()
    } catch (err) {
      console.error('Failed to add client', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pb-24">
      <h1 className="text-xl font-bold mb-4">Clients</h1>

      {/* Search */}
      <input
        type="text"
        placeholder="Search clients..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border border-gray-300 text-base mb-4 focus:outline-none focus:ring-2 focus:ring-[#228B22]"
      />

      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          {search ? 'No clients match your search' : 'No clients yet'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((client) => (
            <button
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="w-full text-left bg-white rounded-lg shadow p-4 active:bg-gray-50 min-h-[48px]"
            >
              <div className="font-semibold text-base">{client.name}</div>
              {client.phone && (
                <div className="text-sm text-gray-600 mt-1">{client.phone}</div>
              )}
              {client.address && (
                <div className="text-sm text-gray-500 mt-0.5 truncate">{client.address}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Inline Add Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-3 animate-slide-up">
            <h2 className="text-lg font-bold">New Client</h2>
            <input
              type="text"
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22]"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22]"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22]"
            />
            <input
              type="text"
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22]"
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-lg border border-gray-300 text-base font-medium min-h-[48px]"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-3 rounded-lg bg-[#228B22] text-white text-base font-medium min-h-[48px] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-[#228B22] text-white text-3xl shadow-lg flex items-center justify-center active:scale-95 z-30"
          aria-label="Add client"
        >
          +
        </button>
      )}
    </div>
  )
}
