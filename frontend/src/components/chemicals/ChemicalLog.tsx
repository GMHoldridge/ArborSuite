import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import type { ChemicalApplication, Job } from '../../types/index'

export default function ChemicalLog() {
  const [apps, setApps] = useState<ChemicalApplication[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Form state
  const [f, setF] = useState({
    job_id: '', product_name: '', epa_reg_number: '', mix_rate: '',
    amount_applied: '', unit: 'gal', target_pest: '', wind_speed_mph: '',
    temp_f: '', applicator_name: '', license_number: '',
    date: new Date().toISOString().slice(0, 10), reentry_hours: '', notes: '',
  })

  const updateF = (key: string, val: string) => setF(prev => ({ ...prev, [key]: val }))

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [c, j] = await Promise.all([
        api.get<ChemicalApplication[]>('/chemicals'),
        api.get<Job[]>('/jobs'),
      ])
      setApps(c)
      setJobs(j)
    } catch (err) {
      console.error('Failed to load chemicals', err)
    } finally {
      setLoading(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await api.post('/chemicals', {
      job_id: f.job_id ? parseInt(f.job_id) : null,
      product_name: f.product_name,
      epa_reg_number: f.epa_reg_number || null,
      mix_rate: f.mix_rate || null,
      amount_applied: f.amount_applied ? parseFloat(f.amount_applied) : null,
      unit: f.unit,
      target_pest: f.target_pest || null,
      wind_speed_mph: f.wind_speed_mph ? parseFloat(f.wind_speed_mph) : null,
      temp_f: f.temp_f ? parseFloat(f.temp_f) : null,
      applicator_name: f.applicator_name || null,
      license_number: f.license_number || null,
      date: f.date,
      reentry_hours: f.reentry_hours ? parseFloat(f.reentry_hours) : null,
      notes: f.notes || null,
    })
    setShowForm(false)
    setF({ job_id: '', product_name: '', epa_reg_number: '', mix_rate: '',
           amount_applied: '', unit: 'gal', target_pest: '', wind_speed_mph: '',
           temp_f: '', applicator_name: '', license_number: '',
           date: new Date().toISOString().slice(0, 10), reentry_hours: '', notes: '' })
    setLoading(true)
    load()
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#228B22] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold mb-1">Chemical Applications</h1>
      <p className="text-xs text-gray-500 mb-4">ISA-compliant treatment records</p>

      {/* Active re-entry warnings */}
      {apps.filter(a => {
        if (!a.reentry_hours) return false
        const appTime = new Date(a.date).getTime()
        const reentryEnd = appTime + a.reentry_hours * 3600000
        return reentryEnd > Date.now()
      }).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="text-sm font-semibold text-red-800 mb-1">Active Re-entry Restrictions</div>
          {apps.filter(a => {
            if (!a.reentry_hours) return false
            const appTime = new Date(a.date).getTime()
            return appTime + a.reentry_hours * 3600000 > Date.now()
          }).map(a => (
            <div key={a.id} className="text-xs text-red-700">
              {a.product_name} — {a.reentry_hours}h REI
              {a.job_title && ` (${a.job_title})`}
            </div>
          ))}
        </div>
      )}

      {apps.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No chemical applications recorded</p>
      ) : (
        <div className="space-y-2">
          {apps.map((app) => (
            <div key={app.id}>
              <button onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                className="w-full bg-white rounded-lg shadow p-4 text-left active:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-lg flex-shrink-0">
                    🧪
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{app.product_name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(app.date).toLocaleDateString()}
                      {app.target_pest && ` · ${app.target_pest}`}
                    </div>
                    {app.job_title && <div className="text-xs text-gray-400">{app.job_title} — {app.client_name}</div>}
                  </div>
                  {app.amount_applied && (
                    <span className="text-sm font-bold text-[#228B22] flex-shrink-0">
                      {app.amount_applied} {app.unit}
                    </span>
                  )}
                </div>
              </button>

              {expandedId === app.id && (
                <div className="bg-gray-50 rounded-b-lg px-4 py-3 -mt-1 border border-t-0 border-gray-200 space-y-1.5">
                  {app.epa_reg_number && <div className="text-xs"><span className="text-gray-500">EPA Reg#:</span> {app.epa_reg_number}</div>}
                  {app.mix_rate && <div className="text-xs"><span className="text-gray-500">Mix Rate:</span> {app.mix_rate}</div>}
                  {app.wind_speed_mph != null && <div className="text-xs"><span className="text-gray-500">Wind:</span> {app.wind_speed_mph} mph</div>}
                  {app.temp_f != null && <div className="text-xs"><span className="text-gray-500">Temp:</span> {app.temp_f}°F</div>}
                  {app.applicator_name && <div className="text-xs"><span className="text-gray-500">Applicator:</span> {app.applicator_name}</div>}
                  {app.license_number && <div className="text-xs"><span className="text-gray-500">License:</span> {app.license_number}</div>}
                  {app.reentry_hours != null && <div className="text-xs"><span className="text-gray-500">REI:</span> {app.reentry_hours}h</div>}
                  {app.notes && <div className="text-xs text-gray-600 mt-1">{app.notes}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-[#228B22] text-white text-3xl shadow-lg flex items-center justify-center active:scale-95 z-30">
          +
        </button>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end justify-center" onClick={() => setShowForm(false)}>
          <form onSubmit={submit} onClick={e => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-bold">Log Chemical Application</h2>

            <input value={f.product_name} onChange={e => updateF('product_name', e.target.value)} placeholder="Product name *" required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />

            <select value={f.job_id} onChange={e => updateF('job_id', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]">
              <option value="">No job linked</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>

            <div className="flex gap-2">
              <input value={f.epa_reg_number} onChange={e => updateF('epa_reg_number', e.target.value)} placeholder="EPA Reg#"
                className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
              <input value={f.mix_rate} onChange={e => updateF('mix_rate', e.target.value)} placeholder="Mix rate"
                className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
            </div>

            <div className="flex gap-2">
              <input type="number" value={f.amount_applied} onChange={e => updateF('amount_applied', e.target.value)} placeholder="Amount" step="0.01"
                className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
              <select value={f.unit} onChange={e => updateF('unit', e.target.value)}
                className="w-20 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]">
                <option value="gal">gal</option><option value="oz">oz</option><option value="lb">lb</option>
                <option value="qt">qt</option><option value="ml">ml</option><option value="l">L</option>
              </select>
            </div>

            <input value={f.target_pest} onChange={e => updateF('target_pest', e.target.value)} placeholder="Target pest/disease"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />

            <div className="flex gap-2">
              <input type="number" value={f.wind_speed_mph} onChange={e => updateF('wind_speed_mph', e.target.value)} placeholder="Wind (mph)" step="0.1"
                className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
              <input type="number" value={f.temp_f} onChange={e => updateF('temp_f', e.target.value)} placeholder="Temp (°F)" step="1"
                className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
            </div>

            <div className="flex gap-2">
              <input value={f.applicator_name} onChange={e => updateF('applicator_name', e.target.value)} placeholder="Applicator name"
                className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
              <input value={f.license_number} onChange={e => updateF('license_number', e.target.value)} placeholder="License#"
                className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
            </div>

            <div className="flex gap-2">
              <input type="date" value={f.date} onChange={e => updateF('date', e.target.value)} required
                className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
              <input type="number" value={f.reentry_hours} onChange={e => updateF('reentry_hours', e.target.value)} placeholder="REI (hrs)" step="1"
                className="w-28 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
            </div>

            <textarea value={f.notes} onChange={e => updateF('notes', e.target.value)} placeholder="Notes" rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />

            <button type="submit" className="w-full py-3 bg-[#228B22] text-white rounded-lg font-bold text-sm">Save Application</button>
          </form>
        </div>
      )}
    </div>
  )
}
