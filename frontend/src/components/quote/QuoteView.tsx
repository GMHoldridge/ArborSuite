import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api/client'
import type { Settings, QuoteLineItem } from '../../types/index'

interface PublicQuote {
  business: Settings
  client_name: string | null
  job_title: string | null
  line_items: QuoteLineItem[]
  total: number
  tax_rate: number
  notes: string | null
  status: 'draft' | 'sent' | 'accepted' | 'declined'
  responded_at: string | null
}

export default function QuoteView() {
  const { token } = useParams<{ token: string }>()
  const [quote, setQuote] = useState<PublicQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<'accepted' | 'declined' | null>(null)

  useEffect(() => {
    api.get<PublicQuote>(`/public/quote/${token}`)
      .then((d) => {
        setQuote(d)
        if (d.status === 'accepted' || d.status === 'declined') setResult(d.status)
      })
      .catch((e) => setError(e.message || 'Estimate not found'))
      .finally(() => setLoading(false))
  }, [token])

  async function respond(action: 'approve' | 'decline') {
    setSubmitting(true)
    try {
      await api.post(`/public/quote/${token}/respond`, { action, note })
      setResult(action === 'approve' ? 'accepted' : 'declined')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-[#228B22] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-6">
        <p className="text-gray-600 text-center">{error || 'This estimate link is invalid or has expired.'}</p>
      </div>
    )
  }

  const biz = quote.business
  const accent = biz.accent_color || '#228B22'
  const subtotal = quote.line_items.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Business header */}
      <div className="text-white px-5 py-6" style={{ background: accent }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {biz.logo_url && <img src={biz.logo_url} alt="" className="w-12 h-12 rounded-lg bg-white/20 object-contain" />}
          <div>
            <h1 className="text-xl font-bold">{biz.business_name || 'Tree Service Estimate'}</h1>
            <p className="text-white/80 text-sm">
              {[biz.phone, biz.address].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">Estimate for</p>
            <p className="font-semibold text-gray-900">{quote.client_name || 'You'}</p>
            {quote.job_title && <p className="text-sm text-gray-600 mt-0.5">{quote.job_title}</p>}
          </div>

          {/* Line items */}
          <div className="px-5 py-3 divide-y divide-gray-50">
            {quote.line_items.map((item, i) => (
              <div key={i} className="flex justify-between py-2.5 text-sm">
                <span className="text-gray-700 pr-3">{item.description}</span>
                <span className="text-gray-900 font-medium whitespace-nowrap">${item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 space-y-1">
            {quote.tax_rate > 0 && (
              <>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax ({(quote.tax_rate * 100).toFixed(1)}%)</span>
                  <span>${(quote.total - subtotal).toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center pt-1">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-2xl font-bold" style={{ color: accent }}>${quote.total.toFixed(2)}</span>
            </div>
          </div>

          {quote.notes && (
            <div className="px-5 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
        </div>

        {/* Action area */}
        {result ? (
          <div className={`mt-5 rounded-2xl p-5 text-center ${result === 'accepted' ? 'bg-green-50 border border-green-200' : 'bg-gray-100 border border-gray-200'}`}>
            <p className="text-lg font-semibold text-gray-900">
              {result === 'accepted' ? '✓ Estimate approved' : 'Estimate declined'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {result === 'accepted'
                ? `Thank you! ${biz.business_name || 'We'} will be in touch to schedule.`
                : 'No problem — reach out if anything changes.'}
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a message (optional)…"
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]"
            />
            <button
              onClick={() => respond('approve')}
              disabled={submitting}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-base disabled:opacity-50 transition-colors min-h-[48px]"
              style={{ background: accent }}
            >
              {submitting ? 'Submitting…' : 'Approve Estimate'}
            </button>
            <button
              onClick={() => respond('decline')}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-white border border-gray-300 text-gray-600 font-medium text-sm disabled:opacity-50 min-h-[44px]"
            >
              Decline
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by {biz.business_name || 'ArborSuite'}
        </p>
      </div>
    </div>
  )
}
