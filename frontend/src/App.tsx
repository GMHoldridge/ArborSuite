import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { api, hasToken, setToken } from './api/client'
import Toaster from './components/ui/Toaster'
import AppShell from './components/layout/AppShell'
import LoginPage from './components/layout/LoginPage'
import Dashboard from './components/layout/Dashboard'
import JobBoard from './components/jobs/JobBoard'
import JobDetail from './components/jobs/JobDetail'
import NewAssessment from './components/assess/NewAssessment'
import AssessmentView from './components/assess/AssessmentView'
import ClientList from './components/clients/ClientList'
import ClientDetail from './components/clients/ClientDetail'
import InvoiceList from './components/invoices/InvoiceList'
import ExpenseList from './components/expenses/ExpenseList'
import ExpenseCapture from './components/expenses/ExpenseCapture'
import ClientSubmit from './components/assess/ClientSubmit'
import CrewTimeLog from './components/crew/CrewTimeLog'
import EquipmentList from './components/equipment/EquipmentList'
import ChemicalLog from './components/chemicals/ChemicalLog'
import RouteOptimizer from './components/route/RouteOptimizer'
import QuoteView from './components/quote/QuoteView'
import SettingsPage from './components/settings/SettingsPage'
import PlannerScan from './components/planner/PlannerScan'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'ok' | 'login' | 'checking'>(
    hasToken() ? 'ok' : 'checking',
  )

  useEffect(() => {
    if (hasToken()) return
    // No token: if no PIN is configured, the app is open — auto-enter.
    api.get<{ setup_complete: boolean }>('/auth/check')
      .then((d) => {
        if (!d.setup_complete) {
          setToken('open')
          setState('ok')
        } else {
          setState('login')
        }
      })
      .catch(() => setState('login'))
  }, [])

  if (state === 'ok') return <>{children}</>
  if (state === 'login') return <Navigate to="/login" />
  return (
    <div className="flex items-center justify-center h-dvh bg-gray-50">
      <div className="w-8 h-8 border-4 border-[#228B22] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/submit/:token" element={<ClientSubmit />} />
        <Route path="/quote/:token" element={<QuoteView />} />
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="jobs" element={<JobBoard />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="assess" element={<NewAssessment />} />
          <Route path="assess/:id" element={<AssessmentView />} />
          <Route path="clients" element={<ClientList />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="invoices" element={<InvoiceList />} />
          <Route path="expenses" element={<ExpenseList />} />
          <Route path="expenses/new" element={<ExpenseCapture />} />
          <Route path="crew" element={<CrewTimeLog />} />
          <Route path="equipment" element={<EquipmentList />} />
          <Route path="chemicals" element={<ChemicalLog />} />
          <Route path="route" element={<RouteOptimizer />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </>
  )
}
