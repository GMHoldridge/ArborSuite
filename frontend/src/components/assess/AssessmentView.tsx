import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { Assessment, AssessmentResult, QuoteLineItem, Quote } from '../../types/index'

interface EditableFieldProps {
  label: string
  value: string | number | null | undefined
  onSave: (val: string) => void
  type?: 'text' | 'number'
}

function EditableField({ label, value, onSave, type = 'text' }: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value ?? ''))

  function commit() {
    onSave(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 shrink-0 w-28">{label}</span>
        <input
          autoFocus
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="flex-1 border border-[#228B22] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]"
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        setDraft(String(value ?? ''))
        setEditing(true)
      }}
      className="flex items-center gap-2 w-full text-left min-h-[44px]"
    >
      <span className="text-sm text-gray-500 shrink-0 w-28">{label}</span>
      <span className="text-sm font-medium text-gray-900 flex-1">
        {value ?? <span className="text-gray-300">--</span>}
      </span>
      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </button>
  )
}

function ChipEditor({
  label,
  items,
  onChange,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  function addChip() {
    const val = draft.trim()
    if (val && !items.includes(val)) {
      onChange([...items, val])
    }
    setDraft('')
    setAdding(false)
  }

  return (
    <div className="min-h-[44px]">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="flex flex-wrap gap-2 mt-1">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 bg-green-50 text-green-800 text-xs font-medium px-2.5 py-1.5 rounded-full"
          >
            {item}
            <button
              onClick={() => onChange(items.filter((i) => i !== item))}
              className="w-4 h-4 flex items-center justify-center text-green-600 hover:text-red-500"
              aria-label={`Remove ${item}`}
            >
              x
            </button>
          </span>
        ))}
        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={addChip}
            onKeyDown={(e) => e.key === 'Enter' && addChip()}
            placeholder="Type & press enter"
            className="text-xs border border-[#228B22] rounded-full px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#228B22] w-36"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="text-xs text-[#228B22] font-medium px-2.5 py-1.5 border border-dashed border-[#228B22]/40 rounded-full min-h-[32px]"
          >
            + Add
          </button>
        )}
      </div>
    </div>
  )
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 shrink-0 w-28">Difficulty</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className={`w-8 h-8 text-lg ${star <= value ? 'text-amber-400' : 'text-gray-200'}`}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            *
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AssessmentView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [corrections, setCorrections] = useState<Partial<AssessmentResult>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Quote builder
  const [showQuote, setShowQuote] = useState(false)
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([])
  const [taxRate, setTaxRate] = useState(0)
  const [newDesc, setNewDesc] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [sendingQuote, setSendingQuote] = useState(false)

  useEffect(() => {
    api.get<Assessment>(`/assess/${id}`)
      .then((data) => {
        setAssessment(data)
        if (data.ai_response) {
          setCorrections({ ...data.ai_response, ...(data.owner_corrections as Partial<AssessmentResult> || {}) })
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  function updateField(key: keyof AssessmentResult, value: string | number | string[] | boolean) {
    setCorrections((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function saveCorrections() {
    setSaving(true)
    try {
      await api.put(`/assess/${id}/corrections`, corrections)
      setSaved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function addLineItem() {
    const desc = newDesc.trim()
    const amt = parseFloat(newAmount)
    if (!desc || isNaN(amt)) return
    setLineItems((prev) => [...prev, { description: desc, amount: amt }])
    setNewDesc('')
    setNewAmount('')
  }

  function removeLineItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0)
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  async function sendQuote() {
    if (lineItems.length === 0 || !assessment?.job_id) return
    setSendingQuote(true)
    try {
      const quote = await api.post<Quote>('/quotes', {
        job_id: assessment.job_id,
        line_items: lineItems,
        tax_rate: taxRate,
      })
      await api.post(`/quotes/${quote.id}/send`, {})
      navigate(`/jobs/${assessment.job_id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send quote')
    } finally {
      setSendingQuote(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-[#228B22] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !assessment) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={() => navigate(-1)} className="text-[#228B22] font-medium min-h-[48px]">
          Go Back
        </button>
      </div>
    )
  }

  const ai = corrections as AssessmentResult

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-[#228B22] font-medium mb-4 min-h-[48px]"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Photo */}
      {assessment?.photo_url && (
        <img
          src={assessment.photo_url}
          alt="Tree assessment"
          className="w-full rounded-xl object-cover max-h-56 mb-4"
        />
      )}

      <h1 className="text-xl font-bold text-gray-900 mb-1">Assessment Results</h1>
      <p className="text-sm text-gray-400 mb-4">Tap any field to edit</p>

      {error && (
        <p className="text-red-600 text-sm mb-3 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Tree Info Card */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-3 space-y-1">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tree Info</h2>
        <EditableField label="Species" value={ai.species} onSave={(v) => updateField('species', v)} />
        <EditableField label="Height (ft)" value={ai.height_estimate_ft} onSave={(v) => updateField('height_estimate_ft', parseFloat(v) || 0)} type="number" />
        <EditableField label="DBH (in)" value={ai.dbh_estimate_in} onSave={(v) => updateField('dbh_estimate_in', parseFloat(v) || 0)} type="number" />
        <EditableField label="Lean" value={ai.lean_direction ? `${ai.lean_direction} ${ai.lean_degrees || 0} deg` : 'None'} onSave={(v) => updateField('lean_direction', v)} />
        <EditableField
          label="Canopy"
          value={ai.canopy_density}
          onSave={(v) => updateField('canopy_density', v as AssessmentResult['canopy_density'])}
        />
      </div>

      {/* Condition Card */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-3 space-y-1">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Condition</h2>
        <EditableField
          label="Decay"
          value={ai.visible_decay ? (ai.decay_description || 'Yes') : 'None'}
          onSave={(v) => {
            updateField('visible_decay', v.toLowerCase() !== 'none')
            updateField('decay_description', v.toLowerCase() !== 'none' ? v : null as unknown as string)
          }}
        />
        <EditableField label="Deadwood %" value={ai.deadwood_pct} onSave={(v) => updateField('deadwood_pct', parseFloat(v) || 0)} type="number" />
        <ChipEditor label="Hazards" items={ai.hazards || []} onChange={(items) => updateField('hazards', items)} />
      </div>

      {/* Work Estimate Card */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-3 space-y-1">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Work Estimate</h2>
        <EditableField
          label="Access"
          value={ai.access_difficulty}
          onSave={(v) => updateField('access_difficulty', v as AssessmentResult['access_difficulty'])}
        />
        <ChipEditor label="Equipment" items={ai.equipment_suggested || []} onChange={(items) => updateField('equipment_suggested', items)} />
        <EditableField label="Time (hrs)" value={ai.time_estimate_hours} onSave={(v) => updateField('time_estimate_hours', parseFloat(v) || 0)} type="number" />
        <StarRating value={ai.difficulty_rating || 0} onChange={(v) => updateField('difficulty_rating', v)} />
      </div>

      {/* Notes Card */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</h2>
        <EditableField label="" value={ai.notes} onSave={(v) => updateField('notes', v)} />
      </div>

      {/* Save Corrections */}
      <button
        onClick={saveCorrections}
        disabled={saving || saved}
        className={`w-full py-3 rounded-xl font-semibold text-base transition-colors min-h-[48px] mb-3 ${
          saved
            ? 'bg-green-100 text-green-800'
            : 'bg-white border-2 border-[#228B22] text-[#228B22] active:bg-green-50'
        } disabled:opacity-70`}
      >
        {saving ? 'Saving...' : saved ? 'Corrections Saved' : 'Save Corrections'}
      </button>

      {/* Build Quote */}
      {!showQuote ? (
        <button
          onClick={() => setShowQuote(true)}
          className="w-full py-3.5 rounded-xl bg-[#228B22] text-white font-semibold text-base active:bg-[#1a6b1a] transition-colors min-h-[48px]"
        >
          Build Quote
        </button>
      ) : (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mt-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quote Builder</h2>

          {/* Existing line items */}
          {lineItems.length > 0 && (
            <div className="space-y-2 mb-4">
              {lineItems.map((li, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-800 flex-1">{li.description}</span>
                  <span className="text-sm font-medium text-gray-900 mx-3">${li.amount.toFixed(2)}</span>
                  <button
                    onClick={() => removeLineItem(idx)}
                    className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600"
                    aria-label="Remove item"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add line item */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]"
            />
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="$"
              className="w-24 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]"
            />
            <button
              onClick={addLineItem}
              disabled={!newDesc.trim() || !newAmount}
              className="px-4 py-2.5 bg-[#228B22] text-white rounded-lg text-sm font-medium disabled:opacity-40 min-w-[48px] min-h-[44px]"
            >
              +
            </button>
          </div>

          {/* Tax rate */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-600">Tax %</span>
            <input
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]"
              step="0.5"
            />
          </div>

          {/* Totals */}
          {lineItems.length > 0 && (
            <div className="border-t border-gray-100 pt-3 mb-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax ({taxRate}%)</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-1">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Send Quote */}
          <button
            onClick={sendQuote}
            disabled={lineItems.length === 0 || sendingQuote || !assessment?.job_id}
            className="w-full py-3.5 rounded-xl bg-[#228B22] text-white font-semibold text-base disabled:opacity-50 active:bg-[#1a6b1a] transition-colors min-h-[48px]"
          >
            {sendingQuote ? 'Sending...' : 'Send Quote'}
          </button>

          {!assessment?.job_id && (
            <p className="text-xs text-amber-600 text-center mt-2">
              This assessment is not linked to a job. Link it first to send a quote.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
