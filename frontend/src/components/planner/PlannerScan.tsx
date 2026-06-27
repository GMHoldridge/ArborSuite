import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { toast, errorMessage } from '../../stores/toast'

interface Entry {
  day: string | null
  client: string | null
  address: string | null
  work: string
  price: number | null
}

export default function PlannerScan() {
  const navigate = useNavigate()
  const [scanning, setScanning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [entries, setEntries] = useState<Entry[] | null>(null)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setEntries(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post<{ entries: Entry[] }>('/planner/scan', fd)
      setEntries(res.entries)
      if (!res.entries.length) toast.error("Couldn't read any jobs — try a clearer photo")
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Scan failed'))
    } finally {
      setScanning(false)
    }
  }

  function update(i: number, field: keyof Entry, value: string) {
    setEntries((prev) => {
      if (!prev) return prev
      const next = [...prev]
      next[i] = { ...next[i], [field]: field === 'price' ? (value === '' ? null : Number(value)) : value }
      return next
    })
  }

  function remove(i: number) {
    setEntries((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev))
  }

  async function doImport() {
    if (!entries?.length) return
    setImporting(true)
    try {
      const res = await api.post<{ created: { clients: number; jobs: number; quotes: number } }>(
        '/planner/import', { entries },
      )
      const c = res.created
      toast.success(`Imported ${c.jobs} jobs, ${c.clients} new clients, ${c.quotes} estimates`)
      navigate('/jobs')
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Import failed'))
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Scan Planner Page</h1>
      <p className="text-sm text-gray-500 mb-4">
        Snap a photo of a notebook page — it reads the jobs so you can review and import them.
      </p>

      {/* Capture */}
      {!entries && !scanning && (
        <label className="block">
          <div className="flex flex-col items-center justify-center gap-3 py-12 border-2 border-dashed border-gray-300 rounded-2xl bg-white text-center cursor-pointer active:bg-gray-50">
            <svg className="w-12 h-12 text-[#228B22]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium text-gray-700">Take or choose a photo</span>
          </div>
          <input type="file" accept="image/*" capture="environment" onChange={onPick} className="sr-only" />
        </label>
      )}

      {/* Scanning */}
      {scanning && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="w-9 h-9 border-3 border-[#228B22] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Reading the page… this takes a few seconds</p>
        </div>
      )}

      {/* Review */}
      {entries && entries.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">{entries.length} job{entries.length !== 1 ? 's' : ''} found — review & edit</p>
            <button onClick={() => setEntries(null)} className="text-sm text-gray-400">Rescan</button>
          </div>
          <div className="space-y-3">
            {entries.map((e, i) => (
              <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 space-y-2">
                <div className="flex gap-2">
                  <input value={e.client || ''} onChange={(ev) => update(i, 'client', ev.target.value)} placeholder="Client"
                    className="flex-1 border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
                  <button onClick={() => remove(i)} className="text-gray-300 px-2" aria-label="Remove">✕</button>
                </div>
                <input value={e.address || ''} onChange={(ev) => update(i, 'address', ev.target.value)} placeholder="Address"
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
                <textarea value={e.work} onChange={(ev) => update(i, 'work', ev.target.value)} placeholder="Work" rows={2}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
                <div className="flex gap-2">
                  <input value={e.day || ''} onChange={(ev) => update(i, 'day', ev.target.value)} placeholder="Day"
                    className="flex-1 border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]" />
                  <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2.5">
                    <span className="text-gray-400 text-sm">$</span>
                    <input type="number" value={e.price ?? ''} onChange={(ev) => update(i, 'price', ev.target.value)} placeholder="Price"
                      className="w-24 py-2 text-sm focus:outline-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={doImport} disabled={importing}
            className="mt-5 w-full py-3.5 rounded-xl bg-[#228B22] text-white font-semibold text-base disabled:opacity-50 active:bg-[#1a6b1a] min-h-[48px]">
            {importing ? 'Importing…' : `Import ${entries.length} Job${entries.length !== 1 ? 's' : ''}`}
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">Creates clients, jobs, and estimates (where a price was written)</p>
        </>
      )}
    </div>
  )
}
