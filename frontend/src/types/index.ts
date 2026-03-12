export interface Client {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  lat: number | null
  lon: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Job {
  id: number
  client_id: number
  status: 'quoted' | 'scheduled' | 'in_progress' | 'done' | 'invoiced' | 'paid'
  title: string
  description: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  weather_status: string | null
  risk_score: string | null
  location_lat: number | null
  location_lon: number | null
  created_at: string
  updated_at: string
  client_name?: string
}

export interface Assessment {
  id: number
  job_id: number | null
  photo_url: string | null
  ai_response: AssessmentResult | null
  owner_corrections: Record<string, unknown> | null
  species: string | null
  height_est: number | null
  difficulty: number | null
  time_est_hours: number | null
  equipment_needed: string[]
  hazards: string[]
  created_at: string
}

export interface AssessmentResult {
  species: string
  height_estimate_ft: number
  dbh_estimate_in: number
  lean_direction: string | null
  lean_degrees: number | null
  visible_decay: boolean
  decay_description: string | null
  deadwood_pct: number
  canopy_density: 'sparse' | 'moderate' | 'dense'
  hazards: string[]
  access_difficulty: 'easy' | 'moderate' | 'difficult' | 'crane_needed'
  equipment_suggested: string[]
  time_estimate_hours: number
  difficulty_rating: number
  notes: string
}

export interface Quote {
  id: number
  job_id: number
  line_items: QuoteLineItem[]
  total: number
  tax_rate: number
  notes: string | null
  sent_at: string | null
  status: 'draft' | 'sent' | 'accepted' | 'declined'
  created_at: string
  client_name?: string
}

export interface QuoteLineItem {
  description: string
  amount: number
}

export interface Invoice {
  id: number
  job_id: number
  quote_id: number | null
  total: number
  paid_amount: number
  paid_at: string | null
  payment_method: string | null
  status: 'unpaid' | 'partial' | 'paid'
  created_at: string
  client_name?: string
}

export interface Expense {
  id: number
  job_id: number | null
  category: string
  amount: number
  description: string | null
  receipt_photo_url: string | null
  mileage_miles: number | null
  date: string
  created_at: string
}

export interface WeatherData {
  status: 'green' | 'yellow' | 'red'
  wind_speed: string
  wind_mph: number
  precip_pct: number
  temp_f: number
  forecast: string
  risks: string[]
  period_name: string
}

export interface DashboardData {
  job_counts: Record<string, number>
  unpaid_invoices: { count: number; total: number }
  month_revenue: number
  month_expenses: number
  month_profit: number
  upcoming_jobs: { id: number; title: string; date: string; client: string }[]
}
