import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import type { Equipment, EquipmentLog, Job } from '../../types/index'

const TYPE_ICONS: Record<string, string> = {
  chainsaw: '🪚',
  chipper: '🌳',
  stump_grinder: '⚙️',
  bucket_truck: '🚛',
  crane: '🏗️',
  climbing_gear: '🧗',
  trailer: '🚜',
  other: '🔧',
}

const TYPE_LABELS: Record<string, string> = {
  chainsaw: 'Chainsaw',
  chipper: 'Chipper',
  stump_grinder: 'Stump Grinder',
  bucket_truck: 'Bucket Truck',
  crane: 'Crane',
  climbing_gear: 'Climbing Gear',
  trailer: 'Trailer',
  other: 'Other',
}

export default function EquipmentList() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [logs, setLogs] = useState<EquipmentLog[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showLogForm, setShowLogForm] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  // Log form
  const [logJobId, setLogJobId] = useState('')
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10))
  const [logHours, setLogHours] = useState('')
  const [logService, setLogService] = useState('')
  const [logNotes, setLogNotes] = useState('')

  // Add equipment form
  const [addName, setAddName] = useState('')
  const [addType, setAddType] = useState('chainsaw')
  const [addSerial, setAddSerial] = useState('')
  const [addInterval, setAddInterval] = useState('50')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [e, j] = await Promise.all([
        api.get<Equipment[]>('/equipment'),
        api.get<Job[]>('/jobs'),
      ])
      setEquipment(e)
      setJobs(j)
    } catch (err) {
      console.error('Failed to load equipment', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadLogs(equipId: number) {
    setSelectedId(equipId)
    const data = await api.get<EquipmentLog[]>(`/equipment/${equipId}/logs`)
    setLogs(data)
  }

  async function submitLog(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    await api.post('/equipment/log', {
      equipment_id: selectedId,
      job_id: logJobId ? parseInt(logJobId) : null,
      date: logDate,
      hours_used: parseFloat(logHours),
      service_performed: logService || null,
      notes: logNotes || null,
    })
    setShowLogForm(false)
    setLogJobId(''); setLogHours(''); setLogService(''); setLogNotes('')
    setLoading(true)
    load()
    loadLogs(selectedId)
  }

  async function addEquipment(e: React.FormEvent) {
    e.preventDefault()
    await api.post('/equipment', {
      name: addName,
      type: addType,
      serial_number: addSerial || null,
      service_interval_hours: parseFloat(addInterval),
    })
    setShowAddForm(false)
    setAddName(''); setAddSerial(''); setAddInterval('50')
    setLoading(true)
    load()
  }

  const selected = equipment.find(e => e.id === selectedId)

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#228B22] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold mb-4">Equipment</h1>

      {!selectedId ? (
        <>
          {/* Service alerts */}
          {equipment.some(e => e.service_due) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="text-sm font-semibold text-amber-800 mb-1">Service Due</div>
              {equipment.filter(e => e.service_due).map(e => (
                <div key={e.id} className="text-xs text-amber-700">{e.name} — {e.total_hours.toFixed(0)}h total</div>
              ))}
            </div>
          )}

          <div className="space-y-2 mb-4">
            {equipment.map((eq) => {
              const pct = eq.service_interval_hours > 0
                ? Math.min(100, ((eq.total_hours % eq.service_interval_hours) / eq.service_interval_hours) * 100)
                : 0
              return (
                <button key={eq.id} onClick={() => loadLogs(eq.id)}
                  className="w-full bg-white rounded-lg shadow p-4 flex items-center gap-3 text-left active:bg-gray-50">
                  <div className="text-2xl w-10 h-10 flex items-center justify-center flex-shrink-0">
                    {TYPE_ICONS[eq.type] || '🔧'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{eq.name}</div>
                    <div className="text-xs text-gray-500">
                      {TYPE_LABELS[eq.type] || eq.type} · {eq.total_hours.toFixed(0)}h total
                    </div>
                    {/* Service progress bar */}
                    <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-400' : 'bg-[#228B22]'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {eq.hours_until_service != null ? `${eq.hours_until_service.toFixed(0)}h until service` : ''}
                    </div>
                  </div>
                  {eq.service_due && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700 flex-shrink-0">DUE</span>
                  )}
                </button>
              )
            })}
          </div>

          {showAddForm ? (
            <form onSubmit={addEquipment} className="bg-white rounded-lg shadow p-4 space-y-3">
              <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Equipment name" required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
              <select value={addType} onChange={e => setAddType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input value={addSerial} onChange={e => setAddSerial(e.target.value)} placeholder="Serial number"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
              <input value={addInterval} onChange={e => setAddInterval(e.target.value)} placeholder="Service interval (hours)" type="number"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2.5 bg-[#228B22] text-white rounded-lg font-medium text-sm">Add</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm">Cancel</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowAddForm(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 font-medium">
              + Add Equipment
            </button>
          )}
        </>
      ) : (
        <>
          {/* Equipment detail */}
          <button onClick={() => { setSelectedId(null); setLogs([]) }}
            className="text-sm text-[#228B22] font-medium mb-3 flex items-center gap-1">
            ← Back to list
          </button>

          {selected && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{TYPE_ICONS[selected.type] || '🔧'}</span>
                <div>
                  <div className="font-bold text-base">{selected.name}</div>
                  <div className="text-xs text-gray-500">{selected.serial_number || 'No serial'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Total hours:</span> <strong>{selected.total_hours.toFixed(0)}h</strong></div>
                <div><span className="text-gray-500">Service every:</span> <strong>{selected.service_interval_hours}h</strong></div>
                <div><span className="text-gray-500">Last service:</span> <strong>{selected.last_service_date || 'Never'}</strong></div>
                <div><span className="text-gray-500">Next in:</span> <strong>{selected.hours_until_service?.toFixed(0) || '—'}h</strong></div>
              </div>
            </div>
          )}

          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Usage Log</h2>
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center py-6 text-sm">No logs yet</p>
          ) : (
            <div className="space-y-2 mb-4">
              {logs.map((log) => (
                <div key={log.id} className={`bg-white rounded-lg shadow p-3 ${log.service_performed ? 'border-l-4 border-amber-400' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium">
                        {log.service_performed ? '🔧 Service' : `${log.hours_used}h used`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.date).toLocaleDateString()}
                        {log.job_title && ` · ${log.job_title}`}
                      </div>
                    </div>
                    {!log.service_performed && <span className="text-sm font-bold text-[#228B22]">{log.hours_used}h</span>}
                  </div>
                  {log.service_performed && <div className="text-xs text-amber-700 mt-1">{log.service_performed}</div>}
                  {log.notes && <div className="text-xs text-gray-400 mt-0.5">{log.notes}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Log usage / service FAB */}
          {!showLogForm && (
            <button onClick={() => setShowLogForm(true)}
              className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-[#228B22] text-white text-3xl shadow-lg flex items-center justify-center active:scale-95 z-30">
              +
            </button>
          )}

          {showLogForm && (
            <div className="fixed inset-0 bg-black/40 z-40 flex items-end justify-center" onClick={() => setShowLogForm(false)}>
              <form onSubmit={submitLog} onClick={e => e.stopPropagation()}
                className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-3">
                <h2 className="text-lg font-bold">Log Usage / Service</h2>
                <select value={logJobId} onChange={e => setLogJobId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]">
                  <option value="">No job</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
                <div className="flex gap-2">
                  <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} required
                    className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
                  <input type="number" value={logHours} onChange={e => setLogHours(e.target.value)} placeholder="Hours" step="0.25" min="0" required
                    className="w-24 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
                </div>
                <input value={logService} onChange={e => setLogService(e.target.value)} placeholder="Service performed (leave blank for usage only)"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
                <input value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Notes"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
                <button type="submit" className="w-full py-3 bg-[#228B22] text-white rounded-lg font-bold text-sm">Save</button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  )
}
