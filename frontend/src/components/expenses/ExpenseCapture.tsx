import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { Job } from '../../types/index'

const IRS_RATE = 0.67

const CATEGORIES = [
  { key: 'fuel', label: 'Fuel', icon: '⛽' },
  { key: 'equipment', label: 'Equipment', icon: '🔧' },
  { key: 'supplies', label: 'Supplies', icon: '📦' },
  { key: 'insurance', label: 'Insurance', icon: '🛡' },
  { key: 'subcontractor', label: 'Subs', icon: '👷' },
  { key: 'meals', label: 'Meals', icon: '🍔' },
  { key: 'mileage', label: 'Mileage', icon: '🚗' },
  { key: 'other', label: 'Other', icon: '💰' },
] as const

export default function ExpenseCapture() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [miles, setMiles] = useState('')
  const [jobId, setJobId] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [saving, setSaving] = useState(false)

  const isMileage = category === 'mileage'
  const mileageAmount = isMileage && miles ? (parseFloat(miles) * IRS_RATE).toFixed(2) : ''
  const effectiveAmount = isMileage ? mileageAmount : amount

  useEffect(() => {
    api.get<Job[]>('/jobs').then(setJobs).catch(() => {})
  }, [])

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!category || !effectiveAmount) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('category', category)
      formData.append('amount', effectiveAmount)
      formData.append('date', date)
      if (description.trim()) formData.append('description', description.trim())
      if (jobId) formData.append('job_id', jobId)
      if (isMileage && miles) formData.append('mileage_miles', miles)
      if (photo) formData.append('receipt_photo', photo)

      await api.post('/expenses', formData)
      navigate('/expenses')
    } catch (err) {
      console.error('Failed to save expense', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pb-24 space-y-5">
      <button
        onClick={() => navigate('/expenses')}
        className="text-[#228B22] font-medium min-h-[48px] flex items-center"
      >
        &larr; Back to Expenses
      </button>

      <h1 className="text-xl font-bold">New Expense</h1>

      {/* Receipt Photo */}
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
        />
        {photoPreview ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-lg overflow-hidden border-2 border-dashed border-[#228B22] min-h-[48px]"
          >
            <img src={photoPreview} alt="Receipt" className="w-full max-h-48 object-cover" />
            <div className="text-sm text-[#228B22] py-2 text-center">Tap to change photo</div>
          </button>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-8 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 text-center min-h-[48px]"
          >
            <div className="text-3xl mb-1">📷</div>
            <div className="text-sm">Tap to capture receipt</div>
          </button>
        )}
      </div>

      {/* Category Selector */}
      <div>
        <div className="text-sm text-gray-600 mb-2">Category *</div>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`flex flex-col items-center justify-center py-3 rounded-lg text-sm font-medium min-h-[64px] transition-colors ${
                category === cat.key
                  ? 'bg-[#228B22] text-white'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              <span className="text-xl mb-0.5">{cat.icon}</span>
              <span className="text-xs">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mileage Input */}
      {isMileage && (
        <div>
          <label className="block">
            <span className="text-sm text-gray-600">Miles Driven</span>
            <input
              type="number"
              inputMode="decimal"
              value={miles}
              onChange={(e) => setMiles(e.target.value)}
              placeholder="0"
              className="mt-1 w-full px-4 py-4 rounded-lg border border-gray-300 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#228B22]"
            />
          </label>
          {miles && (
            <div className="text-center text-sm text-gray-500 mt-1">
              {miles} mi x ${IRS_RATE}/mi = <strong>${mileageAmount}</strong>
            </div>
          )}
        </div>
      )}

      {/* Amount Input */}
      {!isMileage && (
        <div>
          <label className="block">
            <span className="text-sm text-gray-600">Amount *</span>
            <div className="relative mt-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
                $
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-4 rounded-lg border border-gray-300 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#228B22]"
              />
            </div>
          </label>
        </div>
      )}

      {/* Description */}
      <label className="block">
        <span className="text-sm text-gray-600">Description (optional)</span>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was this for?"
          className="mt-1 w-full px-4 py-3 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22]"
        />
      </label>

      {/* Date */}
      <label className="block">
        <span className="text-sm text-gray-600">Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full px-4 py-3 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22]"
        />
      </label>

      {/* Link to Job */}
      <label className="block">
        <span className="text-sm text-gray-600">Link to Job (optional)</span>
        <select
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          className="mt-1 w-full px-4 py-3 rounded-lg border border-gray-300 text-base bg-white focus:outline-none focus:ring-2 focus:ring-[#228B22] min-h-[48px]"
        >
          <option value="">None</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title} {j.client_name ? `(${j.client_name})` : ''}
            </option>
          ))}
        </select>
      </label>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || !category || !effectiveAmount}
        className="w-full py-4 rounded-lg bg-[#228B22] text-white text-lg font-bold min-h-[56px] disabled:opacity-50 active:scale-[0.98]"
      >
        {saving ? 'Saving...' : 'Save Expense'}
      </button>
    </div>
  )
}
