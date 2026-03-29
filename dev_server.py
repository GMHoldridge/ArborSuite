"""Local dev server — runs all API routes as one FastAPI app."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from _lib.db import get_db, run_migrations
from _lib.auth import hash_pin, check_pin, create_token, require_auth
from _lib.models import *
from _lib.weather import get_forecast
from _lib.claude_vision import assess_tree_photo
import json, secrets

os.environ.setdefault("JWT_SECRET", "dev-secret-change-in-prod-1234567890ab")

app = FastAPI(title="ArborSuite Dev")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Run migrations on startup
@app.on_event("startup")
def startup():
    run_migrations()
    _seed_demo_data()

def _seed_demo_data():
    """Insert demo data if DB is empty."""
    db = get_db()
    if db.execute("SELECT COUNT(*) FROM clients").fetchone()[0] > 0:
        return
    # Demo clients
    db.execute("INSERT INTO clients (name, phone, email, address, lat, lon) VALUES (?, ?, ?, ?, ?, ?)",
               ["Sarah Johnson", "555-0101", "sarah@email.com", "123 Oak Street, Portland, OR", 45.5152, -122.6784])
    db.execute("INSERT INTO clients (name, phone, email, address, lat, lon) VALUES (?, ?, ?, ?, ?, ?)",
               ["Mike Peters", "555-0202", "mike@email.com", "456 Elm Avenue, Portland, OR", 45.5231, -122.6765])
    db.execute("INSERT INTO clients (name, phone, email, address, lat, lon) VALUES (?, ?, ?, ?, ?, ?)",
               ["Linda Chen", "555-0303", "linda@email.com", "789 Maple Drive, Portland, OR", 45.5089, -122.6851])
    # Demo jobs
    db.execute("INSERT INTO jobs (client_id, status, title, description, scheduled_date, location_lat, location_lon) VALUES (?, ?, ?, ?, ?, ?, ?)",
               [1, "scheduled", "Remove dead oak in backyard", "Large dead oak leaning toward garage. Client wants full removal + stump grinding.", "2026-03-15", 45.5152, -122.6784])
    db.execute("INSERT INTO jobs (client_id, status, title, description, scheduled_date, location_lat, location_lon) VALUES (?, ?, ?, ?, ?, ?, ?)",
               [2, "quoted", "Trim maple overhanging roof", "Client reports branches scraping roof. Standard crown reduction.", "2026-03-18", 45.5231, -122.6765])
    db.execute("INSERT INTO jobs (client_id, status, title, description, scheduled_date, location_lat, location_lon) VALUES (?, ?, ?, ?, ?, ?, ?)",
               [3, "done", "Emergency storm cleanup", "Fallen limb blocking driveway after Tuesday storm.", "2026-03-10", 45.5089, -122.6851])
    db.execute("INSERT INTO jobs (client_id, status, title, description, scheduled_date) VALUES (?, ?, ?, ?, ?)",
               [1, "in_progress", "Hedge trimming - front yard", "Annual hedge maintenance", "2026-03-12"])
    # Demo quotes
    db.execute("INSERT INTO quotes (job_id, line_items, total, tax_rate, status) VALUES (?, ?, ?, ?, ?)",
               [1, json.dumps([{"description": "Tree removal (labor)", "amount": 1800}, {"description": "Stump grinding", "amount": 350}, {"description": "Debris hauling", "amount": 200}]), 2350, 0, "sent"])
    db.execute("INSERT INTO quotes (job_id, line_items, total, tax_rate, status) VALUES (?, ?, ?, ?, ?)",
               [2, json.dumps([{"description": "Crown reduction", "amount": 600}, {"description": "Cleanup", "amount": 100}]), 700, 0, "draft"])
    # Demo invoices
    db.execute("INSERT INTO invoices (job_id, quote_id, total, paid_amount, status) VALUES (?, ?, ?, ?, ?)",
               [3, None, 450, 0, "unpaid"])
    # Demo expenses
    db.execute("INSERT INTO expenses (category, amount, description, date) VALUES (?, ?, ?, ?)",
               ["fuel", 85.50, "Gas - work truck", "2026-03-10"])
    db.execute("INSERT INTO expenses (category, amount, description, date) VALUES (?, ?, ?, ?)",
               ["equipment", 45.00, "New chain for chainsaw", "2026-03-09"])
    db.execute("INSERT INTO expenses (category, amount, description, date) VALUES (?, ?, ?, ?)",
               ["fuel", 72.30, "Gas - chipper truck", "2026-03-11"])
    db.execute("INSERT INTO expenses (category, amount, description, mileage_miles, date) VALUES (?, ?, ?, ?, ?)",
               ["fuel", 28.14, "Mileage - job site visits", 42, "2026-03-12"])
    # Demo crew members
    db.execute("INSERT INTO crew_members (name, phone, role, hourly_rate) VALUES (?, ?, ?, ?)",
               ["Jake Torres", "555-0401", "foreman", 35.00])
    db.execute("INSERT INTO crew_members (name, phone, role, hourly_rate) VALUES (?, ?, ?, ?)",
               ["Dani Reeves", "555-0402", "climber", 28.00])
    db.execute("INSERT INTO crew_members (name, phone, role, hourly_rate) VALUES (?, ?, ?, ?)",
               ["Tyler Cook", "555-0403", "groundsman", 20.00])
    # Demo time entries
    db.execute("INSERT INTO time_entries (crew_member_id, job_id, date, hours, notes) VALUES (?, ?, ?, ?, ?)",
               [1, 1, "2026-03-15", 8, "Full day - oak removal"])
    db.execute("INSERT INTO time_entries (crew_member_id, job_id, date, hours, notes) VALUES (?, ?, ?, ?, ?)",
               [2, 1, "2026-03-15", 8, "Climbing - oak removal"])
    db.execute("INSERT INTO time_entries (crew_member_id, job_id, date, hours, notes) VALUES (?, ?, ?, ?, ?)",
               [3, 1, "2026-03-15", 8, "Ground crew - oak removal"])
    db.execute("INSERT INTO time_entries (crew_member_id, job_id, date, hours, notes) VALUES (?, ?, ?, ?, ?)",
               [1, 3, "2026-03-10", 3, "Emergency storm cleanup"])
    db.execute("INSERT INTO time_entries (crew_member_id, job_id, date, hours, notes) VALUES (?, ?, ?, ?, ?)",
               [2, 4, "2026-03-12", 4, "Hedge trimming"])
    # Demo equipment
    db.execute("INSERT INTO equipment (name, type, serial_number, purchase_date, last_service_date, service_interval_hours, total_hours) VALUES (?, ?, ?, ?, ?, ?, ?)",
               ["Stihl MS 500i", "chainsaw", "SN-500i-2847", "2025-06-15", "2026-03-01", 50, 187])
    db.execute("INSERT INTO equipment (name, type, serial_number, purchase_date, last_service_date, service_interval_hours, total_hours) VALUES (?, ?, ?, ?, ?, ?, ?)",
               ["Vermeer BC1000XL", "chipper", "VER-BC-9912", "2024-01-10", "2026-02-15", 100, 342])
    db.execute("INSERT INTO equipment (name, type, serial_number, purchase_date, last_service_date, service_interval_hours, total_hours) VALUES (?, ?, ?, ?, ?, ?, ?)",
               ["Altec AT37G Bucket Truck", "bucket_truck", "ALT-37G-5501", "2023-08-20", "2026-01-20", 200, 1205])
    db.execute("INSERT INTO equipment (name, type, serial_number, purchase_date, last_service_date, service_interval_hours, total_hours) VALUES (?, ?, ?, ?, ?, ?, ?)",
               ["Husqvarna SG13", "stump_grinder", "HQ-SG13-3304", "2025-09-01", "2026-03-05", 75, 95])
    # Demo equipment logs
    db.execute("INSERT INTO equipment_logs (equipment_id, job_id, date, hours_used, notes) VALUES (?, ?, ?, ?, ?)",
               [1, 1, "2026-03-15", 4, "Oak removal - heavy cutting"])
    db.execute("INSERT INTO equipment_logs (equipment_id, job_id, date, hours_used, notes) VALUES (?, ?, ?, ?, ?)",
               [2, 1, "2026-03-15", 3, "Chipping oak debris"])
    db.execute("INSERT INTO equipment_logs (equipment_id, job_id, date, hours_used, notes) VALUES (?, ?, ?, ?, ?)",
               [3, 1, "2026-03-15", 6, "Bucket work for canopy access"])
    db.execute("INSERT INTO equipment_logs (equipment_id, job_id, date, hours_used, service_performed, notes) VALUES (?, ?, ?, ?, ?, ?)",
               [1, None, "2026-03-01", 0, "Chain sharpened, bar oiled, air filter replaced", "50-hour service"])
    # Demo chemical applications
    db.execute("INSERT INTO chemical_applications (job_id, product_name, epa_reg_number, mix_rate, amount_applied, unit, target_pest, wind_speed_mph, temp_f, applicator_name, license_number, date, reentry_hours, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
               [4, "Quali-Pro Propiconazole 14.3", "66222-154", "1 oz/gal", 2.5, "gal", "Oak wilt (Ceratocystis fagacearum)", 5, 62, "Jake Torres", "OR-CPO-4412", "2026-03-12", 24, "Trunk injection + soil drench"])
    db.execute("INSERT INTO chemical_applications (job_id, product_name, epa_reg_number, amount_applied, unit, target_pest, wind_speed_mph, temp_f, applicator_name, license_number, date, reentry_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
               [3, "Bonide Systemic Insect Control", "4-493", 0.5, "gal", "Emerald Ash Borer", 3, 58, "Jake Torres", "OR-CPO-4412", "2026-03-10", 12])
    db.commit()

def _auth(authorization: str | None):
    if not require_auth(authorization):
        raise HTTPException(401, "Unauthorized")

# ─── Auth ────────────────────────────────────────────
@app.get("/api/auth/check")
async def auth_check():
    db = get_db()
    row = db.execute("SELECT id FROM auth WHERE id = 1").fetchone()
    return {"setup_complete": row is not None}

@app.post("/api/auth/setup")
async def auth_setup(body: PinSetup):
    if len(body.pin) < 4:
        raise HTTPException(400, "PIN must be at least 4 digits")
    db = get_db()
    existing = db.execute("SELECT id FROM auth WHERE id = 1").fetchone()
    if existing:
        raise HTTPException(400, "PIN already set")
    db.execute("INSERT INTO auth (id, pin_hash) VALUES (1, ?)", [hash_pin(body.pin)])
    db.commit()
    return {"token": create_token()}

@app.post("/api/auth/login")
async def auth_login(body: PinLogin):
    db = get_db()
    row = db.execute("SELECT pin_hash FROM auth WHERE id = 1").fetchone()
    if not row:
        raise HTTPException(400, "No PIN set")
    if not check_pin(body.pin, row[0]):
        raise HTTPException(401, "Invalid PIN")
    return {"token": create_token()}

# ─── Dashboard ───────────────────────────────────────
@app.get("/api/dashboard")
async def dashboard(authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    job_counts = {}
    for row in db.execute("SELECT status, COUNT(*) FROM jobs GROUP BY status").fetchall():
        job_counts[row[0]] = row[1]
    unpaid = db.execute("SELECT COUNT(*), COALESCE(SUM(total - paid_amount), 0) FROM invoices WHERE status != 'paid'").fetchone()
    revenue = db.execute("SELECT COALESCE(SUM(paid_amount), 0) FROM invoices WHERE paid_at LIKE strftime('%Y-%m', 'now') || '%'").fetchone()
    expenses = db.execute("SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date LIKE strftime('%Y-%m', 'now') || '%'").fetchone()
    upcoming = db.execute(
        """SELECT j.id, j.title, j.scheduled_date, c.name FROM jobs j
           LEFT JOIN clients c ON j.client_id = c.id
           WHERE j.status IN ('scheduled','quoted')
           AND j.scheduled_date BETWEEN date('now') AND date('now','+7 days')
           ORDER BY j.scheduled_date LIMIT 5""").fetchall()
    return {
        "job_counts": job_counts,
        "unpaid_invoices": {"count": unpaid[0], "total": unpaid[1]},
        "month_revenue": revenue[0],
        "month_expenses": expenses[0],
        "month_profit": revenue[0] - expenses[0],
        "upcoming_jobs": [{"id": r[0], "title": r[1], "date": r[2], "client": r[3]} for r in upcoming],
    }

# ─── Clients ─────────────────────────────────────────
@app.get("/api/clients")
async def list_clients(authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    rows = db.execute("SELECT * FROM clients ORDER BY name").fetchall()
    cols = ["id","name","phone","email","address","lat","lon","notes","created_at","updated_at"]
    return [dict(zip(cols, row)) for row in rows]

@app.get("/api/clients/{client_id}")
async def get_client(client_id: int, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    row = db.execute("SELECT * FROM clients WHERE id = ?", [client_id]).fetchone()
    if not row: raise HTTPException(404, "Not found")
    cols = ["id","name","phone","email","address","lat","lon","notes","created_at","updated_at"]
    return dict(zip(cols, row))

@app.post("/api/clients")
async def create_client(body: ClientCreate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    cursor = db.execute("INSERT INTO clients (name,phone,email,address,lat,lon,notes) VALUES (?,?,?,?,?,?,?)",
                        [body.name, body.phone, body.email, body.address, body.lat, body.lon, body.notes])
    db.commit()
    return {"id": cursor.lastrowid}

@app.put("/api/clients/{client_id}")
async def update_client(client_id: int, body: ClientCreate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    db.execute("UPDATE clients SET name=?,phone=?,email=?,address=?,lat=?,lon=?,notes=?,updated_at=datetime('now') WHERE id=?",
               [body.name, body.phone, body.email, body.address, body.lat, body.lon, body.notes, client_id])
    db.commit()
    return {"ok": True}

@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: int, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    db.execute("DELETE FROM clients WHERE id = ?", [client_id])
    db.commit()
    return {"ok": True}

# ─── Jobs ────────────────────────────────────────────
JCOLS = ["id","client_id","status","title","description","scheduled_date","scheduled_time",
         "weather_status","risk_score","location_lat","location_lon","created_at","updated_at"]

@app.get("/api/jobs")
async def list_jobs(status: str | None = None, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    q = "SELECT j.*, c.name as client_name FROM jobs j LEFT JOIN clients c ON j.client_id = c.id"
    params = []
    if status:
        q += " WHERE j.status = ?"
        params.append(status)
    q += " ORDER BY j.scheduled_date"
    rows = db.execute(q, params).fetchall()
    return [dict(zip(JCOLS + ["client_name"], row)) for row in rows]

@app.get("/api/jobs/{job_id}")
async def get_job(job_id: int, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    row = db.execute("SELECT j.*, c.name FROM jobs j LEFT JOIN clients c ON j.client_id = c.id WHERE j.id = ?", [job_id]).fetchone()
    if not row: raise HTTPException(404, "Not found")
    return dict(zip(JCOLS + ["client_name"], row))

@app.post("/api/jobs")
async def create_job(body: JobCreate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    cursor = db.execute("INSERT INTO jobs (client_id,title,description,scheduled_date,scheduled_time,location_lat,location_lon) VALUES (?,?,?,?,?,?,?)",
                        [body.client_id, body.title, body.description, body.scheduled_date, body.scheduled_time, body.location_lat, body.location_lon])
    db.commit()
    return {"id": cursor.lastrowid}

@app.put("/api/jobs/{job_id}")
async def update_job(job_id: int, body: JobUpdate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    updates, values = [], []
    for field, val in body.model_dump(exclude_none=True).items():
        updates.append(f"{field} = ?")
        values.append(val)
    if not updates: raise HTTPException(400, "Nothing to update")
    updates.append("updated_at = datetime('now')")
    values.append(job_id)
    db.execute(f"UPDATE jobs SET {', '.join(updates)} WHERE id = ?", values)
    db.commit()
    return {"ok": True}

@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: int, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    db.execute("DELETE FROM jobs WHERE id = ?", [job_id])
    db.commit()
    return {"ok": True}

# ─── Quotes ──────────────────────────────────────────
@app.get("/api/quotes")
async def list_quotes(status: str | None = None, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    q = "SELECT q.*, c.name FROM quotes q JOIN jobs j ON q.job_id = j.id LEFT JOIN clients c ON j.client_id = c.id"
    params = []
    if status:
        q += " WHERE q.status = ?"
        params.append(status)
    rows = db.execute(q + " ORDER BY q.created_at DESC", params).fetchall()
    cols = ["id","job_id","line_items","total","tax_rate","notes","sent_at","status","created_at","client_name"]
    results = []
    for row in rows:
        d = dict(zip(cols, row))
        d["line_items"] = json.loads(d["line_items"]) if d["line_items"] else []
        results.append(d)
    return results

@app.post("/api/quotes")
async def create_quote(body: QuoteCreate, authorization: str | None = Header(None)):
    _auth(authorization)
    items = [i.model_dump() for i in body.line_items]
    subtotal = sum(i["amount"] for i in items)
    total = subtotal * (1 + body.tax_rate)
    db = get_db()
    cursor = db.execute("INSERT INTO quotes (job_id,line_items,total,tax_rate,notes) VALUES (?,?,?,?,?)",
                        [body.job_id, json.dumps(items), total, body.tax_rate, body.notes])
    db.commit()
    return {"id": cursor.lastrowid, "total": total}

# ─── Invoices ────────────────────────────────────────
ICOLS = ["id","job_id","quote_id","total","paid_amount","paid_at","payment_method","status","created_at"]

@app.get("/api/invoices")
async def list_invoices(status: str | None = None, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    q = "SELECT i.*, c.name FROM invoices i JOIN jobs j ON i.job_id = j.id LEFT JOIN clients c ON j.client_id = c.id"
    params = []
    if status:
        q += " WHERE i.status = ?"
        params.append(status)
    rows = db.execute(q + " ORDER BY i.created_at DESC", params).fetchall()
    return [dict(zip(ICOLS + ["client_name"], row)) for row in rows]

@app.post("/api/invoices")
async def create_invoice(body: InvoiceCreate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    cursor = db.execute("INSERT INTO invoices (job_id,quote_id,total) VALUES (?,?,?)", [body.job_id, body.quote_id, body.total])
    db.execute("UPDATE jobs SET status='invoiced', updated_at=datetime('now') WHERE id=?", [body.job_id])
    db.commit()
    return {"id": cursor.lastrowid}

@app.post("/api/invoices/from-quote/{quote_id}")
async def invoice_from_quote(quote_id: int, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    quote = db.execute("SELECT job_id, total FROM quotes WHERE id = ?", [quote_id]).fetchone()
    if not quote: raise HTTPException(404, "Quote not found")
    cursor = db.execute("INSERT INTO invoices (job_id,quote_id,total) VALUES (?,?,?)", [quote[0], quote_id, quote[1]])
    db.execute("UPDATE jobs SET status='invoiced', updated_at=datetime('now') WHERE id=?", [quote[0]])
    db.commit()
    return {"id": cursor.lastrowid, "total": quote[1]}

@app.put("/api/invoices/{invoice_id}")
async def update_invoice(invoice_id: int, body: InvoiceUpdate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    updates, values = [], []
    for field, val in body.model_dump(exclude_none=True).items():
        updates.append(f"{field} = ?")
        values.append(val)
    if body.status == "paid":
        updates.append("paid_at = datetime('now')")
        inv = db.execute("SELECT job_id FROM invoices WHERE id = ?", [invoice_id]).fetchone()
        if inv:
            db.execute("UPDATE jobs SET status='paid', updated_at=datetime('now') WHERE id=?", [inv[0]])
    if updates:
        values.append(invoice_id)
        db.execute(f"UPDATE invoices SET {', '.join(updates)} WHERE id = ?", values)
        db.commit()
    return {"ok": True}

# ─── Expenses ────────────────────────────────────────
ECOLS = ["id","job_id","category","amount","description","receipt_photo_url","mileage_miles","date","created_at"]

@app.get("/api/expenses")
async def list_expenses(category: str | None = None, date_from: str | None = None, date_to: str | None = None, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    q = "SELECT * FROM expenses WHERE 1=1"
    params = []
    if category: q += " AND category = ?"; params.append(category)
    if date_from: q += " AND date >= ?"; params.append(date_from)
    if date_to: q += " AND date <= ?"; params.append(date_to)
    rows = db.execute(q + " ORDER BY date DESC", params).fetchall()
    return [dict(zip(ECOLS, row)) for row in rows]

@app.get("/api/expenses/summary")
async def expense_summary(year: int | None = None, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    q = "SELECT category, SUM(amount), COUNT(*) FROM expenses"
    params = []
    if year: q += " WHERE date LIKE ?"; params.append(f"{year}-%")
    rows = db.execute(q + " GROUP BY category ORDER BY SUM(amount) DESC", params).fetchall()
    return [{"category": r[0], "total": r[1], "count": r[2]} for r in rows]

@app.post("/api/expenses")
async def create_expense(body: ExpenseCreate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    cursor = db.execute("INSERT INTO expenses (job_id,category,amount,description,receipt_photo_url,mileage_miles,date) VALUES (?,?,?,?,?,?,?)",
                        [body.job_id, body.category, body.amount, body.description, body.receipt_photo_url, body.mileage_miles, body.date])
    db.commit()
    return {"id": cursor.lastrowid}

@app.delete("/api/expenses/{expense_id}")
async def delete_expense(expense_id: int, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    db.execute("DELETE FROM expenses WHERE id = ?", [expense_id])
    db.commit()
    return {"ok": True}

# ─── Crew & Time Tracking ───────────────────────────
CREW_COLS = ["id","name","phone","role","hourly_rate","active","created_at"]

@app.get("/api/crew")
async def list_crew(authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    rows = db.execute("SELECT * FROM crew_members ORDER BY name").fetchall()
    return [dict(zip(CREW_COLS, row)) for row in rows]

@app.post("/api/crew")
async def create_crew(body: CrewMemberCreate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    cursor = db.execute("INSERT INTO crew_members (name,phone,role,hourly_rate) VALUES (?,?,?,?)",
                        [body.name, body.phone, body.role, body.hourly_rate])
    db.commit()
    return {"id": cursor.lastrowid}

@app.put("/api/crew/{member_id}")
async def update_crew(member_id: int, body: CrewMemberUpdate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    updates, values = [], []
    for field, val in body.model_dump(exclude_none=True).items():
        updates.append(f"{field} = ?")
        values.append(val)
    if not updates: raise HTTPException(400, "Nothing to update")
    values.append(member_id)
    db.execute(f"UPDATE crew_members SET {', '.join(updates)} WHERE id = ?", values)
    db.commit()
    return {"ok": True}

@app.delete("/api/crew/{member_id}")
async def delete_crew(member_id: int, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    db.execute("DELETE FROM crew_members WHERE id = ?", [member_id])
    db.commit()
    return {"ok": True}

TIME_COLS = ["id","crew_member_id","job_id","date","hours","notes","created_at"]

@app.get("/api/time-entries")
async def list_time_entries(job_id: int | None = None, crew_member_id: int | None = None, date_from: str | None = None, date_to: str | None = None, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    q = """SELECT t.*, cm.name as crew_name, j.title as job_title
           FROM time_entries t
           LEFT JOIN crew_members cm ON t.crew_member_id = cm.id
           LEFT JOIN jobs j ON t.job_id = j.id WHERE 1=1"""
    params = []
    if job_id: q += " AND t.job_id = ?"; params.append(job_id)
    if crew_member_id: q += " AND t.crew_member_id = ?"; params.append(crew_member_id)
    if date_from: q += " AND t.date >= ?"; params.append(date_from)
    if date_to: q += " AND t.date <= ?"; params.append(date_to)
    rows = db.execute(q + " ORDER BY t.date DESC", params).fetchall()
    return [dict(zip(TIME_COLS + ["crew_name","job_title"], row)) for row in rows]

@app.get("/api/time-entries/summary")
async def time_summary(date_from: str | None = None, date_to: str | None = None, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    q = """SELECT cm.id, cm.name, cm.hourly_rate, SUM(t.hours) as total_hours
           FROM time_entries t JOIN crew_members cm ON t.crew_member_id = cm.id WHERE 1=1"""
    params = []
    if date_from: q += " AND t.date >= ?"; params.append(date_from)
    if date_to: q += " AND t.date <= ?"; params.append(date_to)
    rows = db.execute(q + " GROUP BY cm.id ORDER BY total_hours DESC", params).fetchall()
    return [{"id": r[0], "name": r[1], "hourly_rate": r[2], "total_hours": r[3],
             "labor_cost": (r[2] or 0) * r[3]} for r in rows]

@app.post("/api/time-entries")
async def create_time_entry(body: TimeEntryCreate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    cursor = db.execute("INSERT INTO time_entries (crew_member_id,job_id,date,hours,notes) VALUES (?,?,?,?,?)",
                        [body.crew_member_id, body.job_id, body.date, body.hours, body.notes])
    db.commit()
    return {"id": cursor.lastrowid}

@app.delete("/api/time-entries/{entry_id}")
async def delete_time_entry(entry_id: int, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    db.execute("DELETE FROM time_entries WHERE id = ?", [entry_id])
    db.commit()
    return {"ok": True}

# ─── Equipment ──────────────────────────────────────
EQUIP_COLS = ["id","name","type","serial_number","purchase_date","last_service_date","service_interval_hours","total_hours","notes","created_at"]

@app.get("/api/equipment")
async def list_equipment(authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    rows = db.execute("SELECT * FROM equipment ORDER BY name").fetchall()
    results = []
    for row in rows:
        d = dict(zip(EQUIP_COLS, row))
        hours_since = d["total_hours"] - (d.get("_last_svc_hours") or 0)
        d["service_due"] = d["total_hours"] > 0 and d["service_interval_hours"] > 0 and (d["total_hours"] % d["service_interval_hours"]) < (d["service_interval_hours"] * 0.1) if d["total_hours"] > d["service_interval_hours"] else False
        d["hours_until_service"] = d["service_interval_hours"] - (d["total_hours"] % d["service_interval_hours"]) if d["service_interval_hours"] > 0 else None
        results.append(d)
    return results

@app.post("/api/equipment")
async def create_equipment(body: EquipmentCreate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    cursor = db.execute("INSERT INTO equipment (name,type,serial_number,purchase_date,service_interval_hours,notes) VALUES (?,?,?,?,?,?)",
                        [body.name, body.type, body.serial_number, body.purchase_date, body.service_interval_hours, body.notes])
    db.commit()
    return {"id": cursor.lastrowid}

@app.put("/api/equipment/{equip_id}")
async def update_equipment(equip_id: int, body: EquipmentUpdate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    updates, values = [], []
    for field, val in body.model_dump(exclude_none=True).items():
        updates.append(f"{field} = ?")
        values.append(val)
    if not updates: raise HTTPException(400, "Nothing to update")
    values.append(equip_id)
    db.execute(f"UPDATE equipment SET {', '.join(updates)} WHERE id = ?", values)
    db.commit()
    return {"ok": True}

@app.delete("/api/equipment/{equip_id}")
async def delete_equipment(equip_id: int, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    db.execute("DELETE FROM equipment WHERE id = ?", [equip_id])
    db.commit()
    return {"ok": True}

ELOG_COLS = ["id","equipment_id","job_id","date","hours_used","service_performed","notes","created_at"]

@app.get("/api/equipment/{equip_id}/logs")
async def list_equipment_logs(equip_id: int, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    rows = db.execute("""SELECT el.*, j.title as job_title FROM equipment_logs el
                         LEFT JOIN jobs j ON el.job_id = j.id
                         WHERE el.equipment_id = ? ORDER BY el.date DESC""", [equip_id]).fetchall()
    return [dict(zip(ELOG_COLS + ["job_title"], row)) for row in rows]

@app.post("/api/equipment/log")
async def create_equipment_log(body: EquipmentLogCreate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    cursor = db.execute("INSERT INTO equipment_logs (equipment_id,job_id,date,hours_used,service_performed,notes) VALUES (?,?,?,?,?,?)",
                        [body.equipment_id, body.job_id, body.date, body.hours_used, body.service_performed, body.notes])
    # Update total hours on the equipment
    db.execute("UPDATE equipment SET total_hours = total_hours + ? WHERE id = ?", [body.hours_used, body.equipment_id])
    if body.service_performed:
        db.execute("UPDATE equipment SET last_service_date = ? WHERE id = ?", [body.date, body.equipment_id])
    db.commit()
    return {"id": cursor.lastrowid}

# ─── Chemical/Treatment Tracking ────────────────────
CHEM_COLS = ["id","job_id","product_name","epa_reg_number","mix_rate","amount_applied","unit",
             "target_pest","wind_speed_mph","temp_f","applicator_name","license_number","date",
             "reentry_hours","notes","created_at"]

@app.get("/api/chemicals")
async def list_chemicals(job_id: int | None = None, date_from: str | None = None, date_to: str | None = None, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    q = """SELECT ca.*, j.title as job_title, c.name as client_name
           FROM chemical_applications ca
           LEFT JOIN jobs j ON ca.job_id = j.id
           LEFT JOIN clients c ON j.client_id = c.id WHERE 1=1"""
    params = []
    if job_id: q += " AND ca.job_id = ?"; params.append(job_id)
    if date_from: q += " AND ca.date >= ?"; params.append(date_from)
    if date_to: q += " AND ca.date <= ?"; params.append(date_to)
    rows = db.execute(q + " ORDER BY ca.date DESC", params).fetchall()
    return [dict(zip(CHEM_COLS + ["job_title","client_name"], row)) for row in rows]

@app.post("/api/chemicals")
async def create_chemical(body: ChemicalAppCreate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    cursor = db.execute(
        "INSERT INTO chemical_applications (job_id,product_name,epa_reg_number,mix_rate,amount_applied,unit,target_pest,wind_speed_mph,temp_f,applicator_name,license_number,date,reentry_hours,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [body.job_id, body.product_name, body.epa_reg_number, body.mix_rate, body.amount_applied,
         body.unit, body.target_pest, body.wind_speed_mph, body.temp_f, body.applicator_name,
         body.license_number, body.date, body.reentry_hours, body.notes])
    db.commit()
    return {"id": cursor.lastrowid}

@app.delete("/api/chemicals/{chem_id}")
async def delete_chemical(chem_id: int, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    db.execute("DELETE FROM chemical_applications WHERE id = ?", [chem_id])
    db.commit()
    return {"ok": True}

# ─── Route Optimizer ────────────────────────────────
import math

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in miles between two GPS points."""
    R = 3958.8
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

@app.get("/api/route/optimize")
async def optimize_route(date: str | None = None, authorization: str | None = Header(None)):
    """Nearest-neighbor route optimization for scheduled jobs."""
    _auth(authorization)
    db = get_db()
    q = """SELECT j.id, j.title, j.scheduled_date, j.location_lat, j.location_lon, c.name, c.address
           FROM jobs j LEFT JOIN clients c ON j.client_id = c.id
           WHERE j.status IN ('scheduled','in_progress') AND j.location_lat IS NOT NULL AND j.location_lon IS NOT NULL"""
    params = []
    if date: q += " AND j.scheduled_date = ?"; params.append(date)
    rows = db.execute(q + " ORDER BY j.scheduled_date", params).fetchall()
    jobs = [{"id": r[0], "title": r[1], "date": r[2], "lat": r[3], "lon": r[4], "client": r[5], "address": r[6]} for r in rows]

    if len(jobs) <= 1:
        return {"route": jobs, "total_miles": 0}

    # Nearest-neighbor starting from first job
    remaining = list(jobs)
    route = [remaining.pop(0)]
    total_miles = 0
    while remaining:
        last = route[-1]
        nearest_idx = min(range(len(remaining)),
                          key=lambda i: _haversine(last["lat"], last["lon"], remaining[i]["lat"], remaining[i]["lon"]))
        dist = _haversine(last["lat"], last["lon"], remaining[nearest_idx]["lat"], remaining[nearest_idx]["lon"])
        total_miles += dist
        route.append(remaining.pop(nearest_idx))

    # Add distances to each stop
    for i, stop in enumerate(route):
        if i == 0:
            stop["miles_from_prev"] = 0
        else:
            stop["miles_from_prev"] = round(_haversine(route[i-1]["lat"], route[i-1]["lon"], stop["lat"], stop["lon"]), 1)

    return {"route": route, "total_miles": round(total_miles, 1)}

# ─── Weather ─────────────────────────────────────────
@app.get("/api/weather")
async def weather_check(lat: float, lon: float, authorization: str | None = Header(None)):
    _auth(authorization)
    try:
        return await get_forecast(lat, lon)
    except Exception as e:
        raise HTTPException(502, f"Weather API error: {str(e)}")

# ─── Assess ──────────────────────────────────────────
@app.post("/api/assess")
async def assess(photo_url: str = "", job_id: int | None = None, client_notes: str = "", authorization: str | None = Header(None)):
    _auth(authorization)
    if not os.environ.get("ANTHROPIC_API_KEY"):
        # Return mock assessment for dev
        result = {
            "species": "Red Oak (Quercus rubra)",
            "height_estimate_ft": 55,
            "dbh_estimate_in": 24,
            "lean_direction": "toward garage",
            "lean_degrees": 8,
            "visible_decay": True,
            "decay_description": "Fungal conks visible at base, cavity on north side",
            "deadwood_pct": 25,
            "canopy_density": "moderate",
            "hazards": ["Power lines within 15ft", "Garage within drop zone", "Fence on property line"],
            "access_difficulty": "moderate",
            "equipment_suggested": ["Bucket truck", "Rigging lines", "Stump grinder", "Chipper"],
            "time_estimate_hours": 6,
            "difficulty_rating": 4,
            "notes": "Significant lean toward structure. Recommend sectional removal with rigging. Root plate shows signs of compromise — check for soil heaving on arrival."
        }
    else:
        result = await assess_tree_photo(photo_url, client_notes)

    db = get_db()
    cursor = db.execute(
        "INSERT INTO assessments (job_id,photo_url,ai_response,species,height_est,difficulty,time_est_hours,equipment_needed,hazards) VALUES (?,?,?,?,?,?,?,?,?)",
        [job_id, photo_url, json.dumps(result), result.get("species"), result.get("height_estimate_ft"),
         result.get("difficulty_rating"), result.get("time_estimate_hours"),
         json.dumps(result.get("equipment_suggested", [])), json.dumps(result.get("hazards", []))])
    db.commit()
    return {"id": cursor.lastrowid, "assessment": result}

@app.get("/api/assess/{assessment_id}")
async def get_assessment(assessment_id: int, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    row = db.execute("SELECT * FROM assessments WHERE id = ?", [assessment_id]).fetchone()
    if not row: raise HTTPException(404, "Not found")
    cols = ["id","job_id","photo_url","ai_response","owner_corrections","species","height_est","difficulty","time_est_hours","equipment_needed","hazards","created_at"]
    data = dict(zip(cols, row))
    for f in ["ai_response","owner_corrections","equipment_needed","hazards"]:
        if data[f]: data[f] = json.loads(data[f])
    return data

if __name__ == "__main__":
    import uvicorn
    print("ArborSuite dev server: http://localhost:8000")
    print("Frontend dev server:   http://localhost:5173")
    uvicorn.run(app, host="0.0.0.0", port=8000)
