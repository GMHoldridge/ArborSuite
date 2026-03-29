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

export interface CrewMember {
  id: number
  name: string
  phone: string | null
  role: 'climber' | 'groundsman' | 'foreman' | 'operator' | 'apprentice'
  hourly_rate: number | null
  active: number
  created_at: string
}

export interface TimeEntry {
  id: number
  crew_member_id: number
  job_id: number | null
  date: string
  hours: number
  notes: string | null
  created_at: string
  crew_name?: string
  job_title?: string
}

export interface TimeSummary {
  id: number
  name: string
  hourly_rate: number | null
  total_hours: number
  labor_cost: number
}

export interface Equipment {
  id: number
  name: string
  type: 'chainsaw' | 'chipper' | 'stump_grinder' | 'bucket_truck' | 'crane' | 'climbing_gear' | 'trailer' | 'other'
  serial_number: string | null
  purchase_date: string | null
  last_service_date: string | null
  service_interval_hours: number
  total_hours: number
  notes: string | null
  created_at: string
  service_due: boolean
  hours_until_service: number | null
}

export interface EquipmentLog {
  id: number
  equipment_id: number
  job_id: number | null
  date: string
  hours_used: number
  service_performed: string | null
  notes: string | null
  created_at: string
  job_title?: string
}

export interface ChemicalApplication {
  id: number
  job_id: number | null
  product_name: string
  epa_reg_number: string | null
  mix_rate: string | null
  amount_applied: number | null
  unit: string
  target_pest: string | null
  wind_speed_mph: number | null
  temp_f: number | null
  applicator_name: string | null
  license_number: string | null
  date: string
  reentry_hours: number | null
  notes: string | null
  created_at: string
  job_title?: string
  client_name?: string
}

export interface RouteStop {
  id: number
  title: string
  date: string
  lat: number
  lon: number
  client: string
  address: string
  miles_from_prev: number
}

export interface RouteResult {
  route: RouteStop[]
  total_miles: number
}

export interface DashboardData {
  job_counts: Record<string, number>
  unpaid_invoices: { count: number; total: number }
  month_revenue: number
  month_expenses: number
  month_profit: number
  upcoming_jobs: { id: number; title: string; date: string; client: string }[]
}
