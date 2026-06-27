import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import { toast, errorMessage } from '../../stores/toast'

interface RoadmapItem { title: string; status: 'coming' | 'shipped'; desc: string }
interface FeatureRequest { id: number; text: string; submitted_by: string | null; status: string; created_at: string }

export default function Roadmap() {
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([])
  const [requests, setRequests] = useState<FeatureRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [idea, setIdea] = useState('')
  const [sending, setSending] = useState(false)

  async function load() {
    const d = await api.get<{ roadmap: RoadmapItem[]; requests: FeatureRequest[] }>('/roadmap')
    setRoadmap(d.roadmap)
    setRequests(d.requests)
  }

  useEffect(() => {
    load().catch((e) => toast.error(errorMessage(e, 'Failed to load'))).finally(() => setLoading(false))
  }, [])

  async function submit() {
    if (!idea.trim()) return
    setSending(true)
    try {
      await api.post('/feature-requests', { text: idea })
      setIdea('')
      toast.success('Sent — thanks! Added to the list.')
      await load()
    } catch (e: unknown) {
      toast.error(errorMessage(e, 'Could not send'))
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-[#228B22] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const coming = roadmap.filter((r) => r.status === 'coming')
  const shipped = roadmap.filter((r) => r.status === 'shipped')

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">What's Coming</h1>
      <p className="text-sm text-gray-500 mb-5">Features on the way — and a spot to tell us what you need.</p>

      {/* Suggest a feature */}
      <div className="bg-[#228B22]/5 border border-[#228B22]/20 rounded-2xl p-4 mb-6">
        <p className="text-sm font-semibold text-gray-800 mb-2">💡 Got an idea or a pain point?</p>
        <textarea
          value={idea} onChange={(e) => setIdea(e.target.value)} rows={3}
          placeholder="e.g. text reminders the day before a job…"
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]"
        />
        <button onClick={submit} disabled={sending || !idea.trim()}
          className="mt-2 w-full py-2.5 rounded-xl bg-[#228B22] text-white font-semibold text-sm disabled:opacity-50 min-h-[44px]">
          {sending ? 'Sending…' : 'Send it in'}
        </button>
      </div>

      {/* Coming soon */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Coming soon</h2>
      <div className="space-y-2 mb-6">
        {coming.map((r) => (
          <div key={r.title} className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900">{r.title}</p>
              <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">SOON</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Recently shipped */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Recently shipped</h2>
      <div className="space-y-2 mb-6">
        {shipped.map((r) => (
          <div key={r.title} className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-700">{r.title}</p>
              <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">✓ LIVE</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Submitted ideas */}
      {requests.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Your ideas</h2>
          <div className="space-y-2">
            {requests.map((q) => (
              <div key={q.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-start justify-between gap-2">
                <p className="text-sm text-gray-700">{q.text}</p>
                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">{q.status}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
