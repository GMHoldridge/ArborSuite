import os
import libsql_experimental as libsql

_conn = None

def get_db():
    global _conn
    if _conn is None:
        url = os.environ["TURSO_DATABASE_URL"]
        token = os.environ["TURSO_AUTH_TOKEN"]
        _conn = libsql.connect(url=url, auth_token=token)
    return _conn

def run_migrations():
    db = get_db()
    db.executescript(SCHEMA)
    db.commit()

SCHEMA = """
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    lat REAL,
    lon REAL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id),
    status TEXT DEFAULT 'quoted' CHECK(status IN ('quoted','scheduled','in_progress','done','invoiced','paid')),
    title TEXT NOT NULL,
    description TEXT,
    scheduled_date TEXT,
    scheduled_time TEXT,
    weather_status TEXT,
    risk_score TEXT,
    location_lat REAL,
    location_lon REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER REFERENCES jobs(id),
    photo_url TEXT,
    ai_response TEXT,
    owner_corrections TEXT,
    species TEXT,
    height_est REAL,
    difficulty INTEGER,
    time_est_hours REAL,
    equipment_needed TEXT,
    hazards TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER REFERENCES jobs(id),
    line_items TEXT,
    total REAL,
    tax_rate REAL DEFAULT 0,
    notes TEXT,
    sent_at TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','sent','accepted','declined')),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER REFERENCES jobs(id),
    quote_id INTEGER REFERENCES quotes(id),
    total REAL,
    paid_amount REAL DEFAULT 0,
    paid_at TEXT,
    payment_method TEXT,
    status TEXT DEFAULT 'unpaid' CHECK(status IN ('unpaid','partial','paid')),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER REFERENCES jobs(id),
    category TEXT CHECK(category IN ('fuel','equipment','supplies','insurance','subcontractor','meals','other')),
    amount REAL NOT NULL,
    description TEXT,
    receipt_photo_url TEXT,
    mileage_miles REAL,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER REFERENCES jobs(id),
    url TEXT NOT NULL,
    type TEXT CHECK(type IN ('before','after','assessment','receipt')),
    caption TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auth (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    pin_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
"""
