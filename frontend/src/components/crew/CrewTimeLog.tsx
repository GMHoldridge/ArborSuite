import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import type { CrewMember, TimeEntry, TimeSummary, Job } from '../../types/index'

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  foreman: { label: 'Foreman', color: 'bg-amber-100 text-amber-800' },
  climber: { label: 'Climber', color: 'bg-blue-100 text-blue-800' },
  groundsman: { label: 'Ground', color: 'bg-green-100 text-green-800' },
  operator: { label: 'Operator', color: 'bg-purple-100 text-purple-800' },
  apprentice: { label: 'Apprentice', color: 'bg-gray-100 text-gray-700' },
}

export default function CrewTimeLog() {
  const [crew, setCrew] = useState<CrewMember[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [summary, setSummary] = useState<TimeSummary[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'log' | 'crew' | 'summary'>('log')
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [formCrewId, setFormCrewId] = useState('')
  const [formJobId, setFormJobId] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10))
  const [formHours, setFormHours] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // Add crew form
  const [showAddCrew, setShowAddCrew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newRole, setNewRole] = useState('climber')
  const [newRate, setNewRate] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [c, e, s, j] = await Promise.all([
        api.get<CrewMember[]>('/crew'),
        api.get<TimeEntry[]>('/time-entries'),
        api.get<TimeSummary[]>('/time-entries/summary'),
        api.get<Job[]>('/jobs'),
      ])
      setCrew(c)
      setEntries(e)
      setSummary(s)
      setJobs(j)
    } catch (err) {
      console.error('Failed to load crew data', err)
    } finally {
      setLoading(false)
    }
  }

  async function submitTime(e: React.FormEvent) {
    e.preventDefault()
    await api.post('/time-entries', {
      crew_member_id: parseInt(formCrewId),
      job_id: formJobId ? parseInt(formJobId) : null,
      date: formDate,
      hours: parseFloat(formHours),
      notes: formNotes || null,
    })
    setShowForm(false)
    setFormCrewId(''); setFormJobId(''); setFormHours(''); setFormNotes('')
    setLoading(true)
    load()
  }

  async function addCrew(e: React.FormEvent) {
    e.preventDefault()
    await api.post('/crew', {
      name: newName,
      phone: newPhone || null,
      role: newRole,
      hourly_rate: newRate ? parseFloat(newRate) : null,
    })
    setShowAddCrew(false)
    setNewName(''); setNewPhone(''); setNewRole('climber'); setNewRate('')
    setLoading(true)
    load()
  }

  const totalHours = entries.reduce((s, e) => s + e.hours, 0)
  const totalCost = summary.reduce((s, e) => s + e.labor_cost, 0)

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#228B22] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold mb-4">Crew & Time</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
        {(['log', 'crew', 'summary'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === t ? 'bg-white shadow text-[#228B22]' : 'text-gray-500'}`}>
            {t === 'log' ? 'Time Log' : t === 'crew' ? 'Crew' : 'Summary'}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <>
          {/* Summary card */}
          <div className="bg-[#228B22]/10 border border-[#228B22]/30 rounded-lg p-4 mb-4">
            <div className="flex justify-between">
              <div>
                <div className="text-sm text-[#228B22]">Total Hours</div>
                <div className="text-2xl font-bold text-[#228B22]">{totalHours.toFixed(1)}h</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-[#228B22]">Labor Cost</div>
                <div className="text-2xl font-bold text-[#228B22]">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>

          {entries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No time entries yet</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#228B22]/10 flex items-center justify-center text-[#228B22] font-bold text-sm flex-shrink-0">
                    {entry.hours}h
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{entry.crew_name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.date).toLocaleDateString()}
                      {entry.job_title && ` · ${entry.job_title}`}
                    </div>
                    {entry.notes && <div className="text-xs text-gray-400 mt-0.5 truncate">{entry.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'crew' && (
        <>
          <div className="space-y-2 mb-4">
            {crew.map((m) => {
              const role = ROLE_LABELS[m.role] || { label: m.role, color: 'bg-gray-100 text-gray-700' }
              return (
                <div key={m.id} className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                    {m.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{m.name}</div>
                    <div className="text-xs text-gray-500">{m.phone || 'No phone'}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${role.color}`}>{role.label}</span>
                    {m.hourly_rate && <span className="text-xs text-gray-500">${m.hourly_rate}/hr</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {showAddCrew && (
            <form onSubmit={addCrew} className="bg-white rounded-lg shadow p-4 space-y-3 mb-4">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
              <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
              <select value={newRole} onChange={e => setNewRole(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]">
                <option value="climber">Climber</option>
                <option value="groundsman">Groundsman</option>
                <option value="foreman">Foreman</option>
                <option value="operator">Operator</option>
                <option value="apprentice">Apprentice</option>
              </select>
              <input value={newRate} onChange={e => setNewRate(e.target.value)} placeholder="Hourly rate" type="number" step="0.01"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2.5 bg-[#228B22] text-white rounded-lg font-medium text-sm">Add</button>
                <button type="button" onClick={() => setShowAddCrew(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm">Cancel</button>
              </div>
            </form>
          )}

          {!showAddCrew && (
            <button onClick={() => setShowAddCrew(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 font-medium">
              + Add Crew Member
            </button>
          )}
        </>
      )}

      {tab === 'summary' && (
        <div className="space-y-2">
          {summary.map((s) => (
            <div key={s.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{s.name}</div>
                <div className="text-xs text-gray-500">{s.total_hours.toFixed(1)} hours @ ${s.hourly_rate || 0}/hr</div>
              </div>
              <div className="text-base font-bold text-[#228B22]">
                ${s.labor_cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
          {summary.length === 0 && <p className="text-gray-500 text-center py-8">No time data yet</p>}
        </div>
      )}

      {/* FAB — log time */}
      {tab === 'log' && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-[#228B22] text-white text-3xl shadow-lg flex items-center justify-center active:scale-95 z-30">
          +
        </button>
      )}

      {/* Log time modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end justify-center" onClick={() => setShowForm(false)}>
          <form onSubmit={submitTime} onClick={e => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-3 animate-slide-up">
            <h2 className="text-lg font-bold">Log Time</h2>
            <select value={formCrewId} onChange={e => setFormCrewId(e.target.value)} required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]">
              <option value="">Select crew member</option>
              {crew.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={formJobId} onChange={e => setFormJobId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]">
              <option value="">No job (overhead)</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required
                className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
              <input type="number" value={formHours} onChange={e => setFormHours(e.target.value)} placeholder="Hours" step="0.25" min="0" required
                className="w-24 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
            </div>
            <input value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Notes (optional)"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
            <button type="submit" className="w-full py-3 bg-[#228B22] text-white rounded-lg font-bold text-sm">Save</button>
          </form>
        </div>
      )}
    </div>
  )
}
