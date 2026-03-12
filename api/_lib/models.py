from pydantic import BaseModel
from typing import Optional

# Auth
class PinSetup(BaseModel):
    pin: str

class PinLogin(BaseModel):
    pin: str

class TokenResponse(BaseModel):
    token: str

# Clients
class ClientCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    notes: Optional[str] = None

class ClientResponse(BaseModel):
    id: int
    name: str
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    lat: Optional[float]
    lon: Optional[float]
    notes: Optional[str]
    created_at: str
    updated_at: str

# Jobs
class JobCreate(BaseModel):
    client_id: int
    title: str
    description: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    location_lat: Optional[float] = None
    location_lon: Optional[float] = None

class JobUpdate(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    weather_status: Optional[str] = None
    risk_score: Optional[str] = None

class JobResponse(BaseModel):
    id: int
    client_id: int
    status: str
    title: str
    description: Optional[str]
    scheduled_date: Optional[str]
    scheduled_time: Optional[str]
    weather_status: Optional[str]
    risk_score: Optional[str]
    location_lat: Optional[float]
    location_lon: Optional[float]
    created_at: str
    updated_at: str
    client_name: Optional[str] = None

# Assessments
class AssessmentResult(BaseModel):
    species: Optional[str] = None
    height_estimate_ft: Optional[float] = None
    dbh_estimate_in: Optional[float] = None
    lean_direction: Optional[str] = None
    lean_degrees: Optional[float] = None
    visible_decay: Optional[bool] = None
    decay_description: Optional[str] = None
    deadwood_pct: Optional[float] = None
    canopy_density: Optional[str] = None
    hazards: list[str] = []
    access_difficulty: Optional[str] = None
    equipment_suggested: list[str] = []
    time_estimate_hours: Optional[float] = None
    difficulty_rating: Optional[int] = None
    notes: Optional[str] = None

class AssessmentResponse(BaseModel):
    id: int
    job_id: Optional[int]
    photo_url: Optional[str]
    ai_result: Optional[AssessmentResult]
    owner_corrections: Optional[dict]
    created_at: str

# Quotes
class QuoteLineItem(BaseModel):
    description: str
    amount: float

class QuoteCreate(BaseModel):
    job_id: int
    line_items: list[QuoteLineItem]
    tax_rate: float = 0
    notes: Optional[str] = None

class QuoteResponse(BaseModel):
    id: int
    job_id: int
    line_items: list[QuoteLineItem]
    total: float
    tax_rate: float
    notes: Optional[str]
    sent_at: Optional[str]
    status: str
    created_at: str

# Invoices
class InvoiceCreate(BaseModel):
    job_id: int
    quote_id: Optional[int] = None
    total: float

class InvoiceUpdate(BaseModel):
    paid_amount: Optional[float] = None
    payment_method: Optional[str] = None
    status: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: int
    job_id: int
    quote_id: Optional[int]
    total: float
    paid_amount: float
    paid_at: Optional[str]
    payment_method: Optional[str]
    status: str
    created_at: str
    client_name: Optional[str] = None

# Expenses
class ExpenseCreate(BaseModel):
    job_id: Optional[int] = None
    category: str
    amount: float
    description: Optional[str] = None
    receipt_photo_url: Optional[str] = None
    mileage_miles: Optional[float] = None
    date: str

class ExpenseResponse(BaseModel):
    id: int
    job_id: Optional[int]
    category: str
    amount: float
    description: Optional[str]
    receipt_photo_url: Optional[str]
    mileage_miles: Optional[float]
    date: str
    created_at: str
