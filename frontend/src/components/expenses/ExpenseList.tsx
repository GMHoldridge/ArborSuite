import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { Expense } from '../../types/index'

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '📋' },
  { key: 'fuel', label: 'Fuel', icon: '⛽' },
  { key: 'equipment', label: 'Equipment', icon: '🔧' },
  { key: 'supplies', label: 'Supplies', icon: '📦' },
  { key: 'insurance', label: 'Insurance', icon: '🛡' },
  { key: 'subcontractor', label: 'Subs', icon: '👷' },
  { key: 'meals', label: 'Meals', icon: '🍔' },
  { key: 'other', label: 'Other', icon: '💰' },
] as const

const CATEGORY_ICONS: Record<string, string> = {
  fuel: '⛽',
  equipment: '🔧',
  supplies: '📦',
  insurance: '🛡',
  subcontractor: '👷',
  meals: '🍔',
  mileage: '🚗',
  other: '💰',
}

export default function ExpenseList() {
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Expense[]>('/expenses')
        setExpenses(data)
      } catch (err) {
        console.error('Failed to load expenses', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = expenses.filter((e) => {
    if (category !== 'all' && e.category !== category) return false
    if (dateFrom && e.date < dateFrom) return false
    if (dateTo && e.date > dateTo) return false
    return true
  })

  const total = filtered.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="pb-24">
      <h1 className="text-xl font-bold mb-4">Expenses</h1>

      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium min-h-[48px] flex items-center gap-1.5 ${
              category === cat.key
                ? 'bg-[#228B22] text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Date Range */}
      <div className="flex gap-2 mb-4">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]"
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]"
          placeholder="To"
        />
      </div>

      {/* Summary Card */}
      <div className="bg-[#228B22]/10 border border-[#228B22]/30 rounded-lg p-4 mb-4">
        <div className="text-sm text-[#228B22]">
          Total{category !== 'all' ? ` (${category})` : ''}
        </div>
        <div className="text-2xl font-bold text-[#228B22]">
          ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{filtered.length} expenses</div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No expenses found</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((exp) => (
            <div
              key={exp.id}
              className="bg-white rounded-lg shadow p-4 flex items-center gap-3 min-h-[48px]"
            >
              <div className="text-2xl w-10 h-10 flex items-center justify-center flex-shrink-0">
                {CATEGORY_ICONS[exp.category] || '💰'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {exp.description || exp.category}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(exp.date).toLocaleDateString()}
                  {exp.mileage_miles && ` · ${exp.mileage_miles} mi`}
                </div>
              </div>
              <div className="font-bold text-base flex-shrink-0">
                ${exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate('/expenses/new')}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-[#228B22] text-white text-3xl shadow-lg flex items-center justify-center active:scale-95 z-30"
        aria-label="Add expense"
      >
        +
      </button>
    </div>
  )
}
