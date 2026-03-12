import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import type { Invoice } from '../../types/index'

type Tab = 'unpaid' | 'paid' | 'all'
type PaymentMethod = 'cash' | 'check' | 'venmo' | 'zelle' | 'other'

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('unpaid')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [marking, setMarking] = useState(false)
  const [sending, setSending] = useState(false)
  const [quoteId, setQuoteId] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchInvoices()
  }, [])

  async function fetchInvoices() {
    try {
      const data = await api.get<Invoice[]>('/invoices')
      setInvoices(data)
    } catch (err) {
      console.error('Failed to load invoices', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = invoices.filter((inv) => {
    if (tab === 'unpaid') return inv.status === 'unpaid' || inv.status === 'partial'
    if (tab === 'paid') return inv.status === 'paid'
    return true
  })

  const unpaidTotal = invoices
    .filter((inv) => inv.status === 'unpaid' || inv.status === 'partial')
    .reduce((sum, inv) => sum + (inv.total - inv.paid_amount), 0)

  async function markPaid(inv: Invoice) {
    setMarking(true)
    try {
      await api.put(`/invoices/${inv.id}`, {
        status: 'paid',
        paid_amount: inv.total,
        payment_method: payMethod,
        paid_at: new Date().toISOString(),
      })
      setExpandedId(null)
      await fetchInvoices()
    } catch (err) {
      console.error('Failed to mark paid', err)
    } finally {
      setMarking(false)
    }
  }

  async function sendReminder(inv: Invoice) {
    setSending(true)
    try {
      await api.post(`/invoices/${inv.id}/reminder`)
    } catch (err) {
      console.error('Failed to send reminder', err)
    } finally {
      setSending(false)
    }
  }

  async function createFromQuote() {
    if (!quoteId.trim()) return
    setCreating(true)
    try {
      await api.post(`/invoices/from-quote/${quoteId.trim()}`)
      setQuoteId('')
      await fetchInvoices()
    } catch (err) {
      console.error('Failed to create invoice', err)
    } finally {
      setCreating(false)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'unpaid', label: 'Unpaid' },
    { key: 'paid', label: 'Paid' },
    { key: 'all', label: 'All' },
  ]

  const paymentMethods: PaymentMethod[] = ['cash', 'check', 'venmo', 'zelle', 'other']

  const statusColors: Record<string, string> = {
    unpaid: 'bg-red-100 text-red-700',
    partial: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-700',
  }

  return (
    <div className="pb-24">
      <h1 className="text-xl font-bold mb-4">Invoices</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setExpandedId(null) }}
            className={`flex-1 py-2.5 rounded-md text-sm font-medium min-h-[48px] transition-colors ${
              tab === t.key ? 'bg-white shadow text-[#228B22]' : 'text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Unpaid summary */}
      {tab === 'unpaid' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="text-sm text-red-600">Total Outstanding</div>
          <div className="text-2xl font-bold text-red-700">
            ${unpaidTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      )}

      {/* Create from Quote */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Quote ID"
          value={quoteId}
          onChange={(e) => setQuoteId(e.target.value)}
          className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22]"
        />
        <button
          onClick={createFromQuote}
          disabled={creating || !quoteId.trim()}
          className="px-4 py-3 rounded-lg bg-[#228B22] text-white text-sm font-medium min-h-[48px] whitespace-nowrap disabled:opacity-50"
        >
          {creating ? '...' : 'Create from Quote'}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No invoices</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <div key={inv.id} className="bg-white rounded-lg shadow">
              <button
                onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                className="w-full text-left p-4 min-h-[48px]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{inv.client_name || `Invoice #${inv.id}`}</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-base">
                      ${inv.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[inv.status] || 'bg-gray-200'}`}
                    >
                      {inv.status}
                    </span>
                  </div>
                </div>
              </button>

              {/* Expanded Actions */}
              {expandedId === inv.id && inv.status !== 'paid' && (
                <div className="border-t border-gray-100 p-4 space-y-3">
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Payment Method</div>
                    <div className="flex flex-wrap gap-2">
                      {paymentMethods.map((m) => (
                        <button
                          key={m}
                          onClick={() => setPayMethod(m)}
                          className={`px-4 py-2 rounded-full text-sm font-medium min-h-[48px] capitalize ${
                            payMethod === m
                              ? 'bg-[#228B22] text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => markPaid(inv)}
                      disabled={marking}
                      className="flex-1 py-3 rounded-lg bg-[#228B22] text-white font-medium min-h-[48px] disabled:opacity-50"
                    >
                      {marking ? 'Saving...' : 'Mark as Paid'}
                    </button>
                    <button
                      onClick={() => sendReminder(inv)}
                      disabled={sending}
                      className="flex-1 py-3 rounded-lg border-2 border-[#228B22] text-[#228B22] font-medium min-h-[48px] disabled:opacity-50"
                    >
                      {sending ? 'Sending...' : 'Send Reminder'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
