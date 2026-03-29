import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import type { RouteResult } from '../../types/index'

export default function RouteOptimizer() {
  const [result, setResult] = useState<RouteResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState('')

  useEffect(() => { load() }, [])

  async function load(filterDate?: string) {
    setLoading(true)
    try {
      const path = filterDate ? `/route/optimize?date=${filterDate}` : '/route/optimize'
      const data = await api.get<RouteResult>(path)
      setResult(data)
    } catch (err) {
      console.error('Failed to load route', err)
    } finally {
      setLoading(false)
    }
  }

  function handleDateChange(val: string) {
    setDate(val)
    load(val || undefined)
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#228B22] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold mb-1">Route Planner</h1>
      <p className="text-xs text-gray-500 mb-4">Optimized job order to minimize drive time</p>

      {/* Date filter */}
      <input type="date" value={date} onChange={e => handleDateChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22] mb-4" />

      {result && result.route.length > 0 ? (
        <>
          {/* Summary */}
          <div className="bg-[#228B22]/10 border border-[#228B22]/30 rounded-lg p-4 mb-4 flex justify-between items-center">
            <div>
              <div className="text-sm text-[#228B22]">Total Distance</div>
              <div className="text-2xl font-bold text-[#228B22]">{result.total_miles} mi</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#228B22]">Stops</div>
              <div className="text-2xl font-bold text-[#228B22]">{result.route.length}</div>
            </div>
          </div>

          {/* Route list */}
          <div className="space-y-0">
            {result.route.map((stop, i) => (
              <div key={stop.id} className="flex gap-3">
                {/* Timeline */}
                <div className="flex flex-col items-center w-8 flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-[#228B22] text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {i + 1}
                  </div>
                  {i < result.route.length - 1 && (
                    <div className="flex flex-col items-center flex-1 py-1">
                      <div className="w-0.5 flex-1 bg-gray-300" />
                      {stop.miles_from_prev > 0 && (
                        <div className="text-[10px] text-gray-400 my-1">{result.route[i + 1].miles_from_prev} mi</div>
                      )}
                      <div className="w-0.5 flex-1 bg-gray-300" />
                    </div>
                  )}
                </div>

                {/* Card */}
                <Link to={`/jobs/${stop.id}`}
                  className="flex-1 bg-white rounded-lg shadow p-3 mb-2 active:bg-gray-50">
                  <div className="font-medium text-sm">{stop.title}</div>
                  <div className="text-xs text-gray-500">{stop.client}</div>
                  {stop.address && <div className="text-xs text-gray-400 mt-0.5">{stop.address}</div>}
                  {stop.date && (
                    <div className="text-xs text-[#228B22] mt-1">
                      {new Date(stop.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </Link>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🗺️</div>
          <p className="text-gray-500 text-sm">No scheduled jobs with locations found</p>
          <p className="text-gray-400 text-xs mt-1">Jobs need GPS coordinates to be routed</p>
        </div>
      )}
    </div>
  )
}
