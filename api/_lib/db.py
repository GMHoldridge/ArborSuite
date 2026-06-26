import os
import sqlite3

try:
    import libsql_experimental as libsql
except ImportError:
    libsql = None

def get_db():
    """Open a connection. Returns a fresh connection per call so it is safe to
    use across request-handler threads (the old module-level singleton crashed
    with 'SQLite objects created in a thread can only be used in that same
    thread' under concurrent requests). Each handler calls get_db() once."""
    turso_url = os.environ.get("TURSO_DATABASE_URL")
    turso_token = os.environ.get("TURSO_AUTH_TOKEN")
    if libsql and turso_url and turso_token:
        return libsql.connect(url=turso_url, auth_token=turso_token)
    db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'arborsuite.db')
    return sqlite3.connect(db_path, check_same_thread=False)

def run_migrations():
    db = get_db()
    db.executescript(SCHEMA)
    _migrate_additive(db)
    db.commit()

def _migrate_additive(db):
    """Add columns/tables to DBs created before a schema change.
    CREATE TABLE IF NOT EXISTS won't alter an existing table, so any column
    added to SCHEMA after a DB already exists must be ALTER'd in here."""
    existing = {r[1] for r in db.execute("PRAGMA table_info(quotes)").fetchall()}
    for col, ddl in [
        ("token", "ALTER TABLE quotes ADD COLUMN token TEXT"),
        ("viewed_at", "ALTER TABLE quotes ADD COLUMN viewed_at TEXT"),
        ("view_count", "ALTER TABLE quotes ADD COLUMN view_count INTEGER DEFAULT 0"),
        ("responded_at", "ALTER TABLE quotes ADD COLUMN responded_at TEXT"),
        ("client_note", "ALTER TABLE quotes ADD COLUMN client_note TEXT"),
    ]:
        if col not in existing:
            db.execute(ddl)

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
    token TEXT,
    viewed_at TEXT,
    view_count INTEGER DEFAULT 0,
    responded_at TEXT,
    client_note TEXT,
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

CREATE TABLE IF NOT EXISTS crew_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'climber' CHECK(role IN ('climber','groundsman','foreman','operator','apprentice')),
    hourly_rate REAL,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crew_member_id INTEGER REFERENCES crew_members(id),
    job_id INTEGER REFERENCES jobs(id),
    date TEXT NOT NULL,
    hours REAL NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('chainsaw','chipper','stump_grinder','bucket_truck','crane','climbing_gear','trailer','other')),
    serial_number TEXT,
    purchase_date TEXT,
    last_service_date TEXT,
    service_interval_hours REAL DEFAULT 50,
    total_hours REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS equipment_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER REFERENCES equipment(id),
    job_id INTEGER REFERENCES jobs(id),
    date TEXT NOT NULL,
    hours_used REAL NOT NULL,
    service_performed TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chemical_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER REFERENCES jobs(id),
    product_name TEXT NOT NULL,
    epa_reg_number TEXT,
    mix_rate TEXT,
    amount_applied REAL,
    unit TEXT DEFAULT 'gal' CHECK(unit IN ('gal','oz','lb','qt','ml','l')),
    target_pest TEXT,
    wind_speed_mph REAL,
    temp_f REAL,
    applicator_name TEXT,
    license_number TEXT,
    date TEXT NOT NULL,
    reentry_hours REAL,
    notes TEXT,
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

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    business_name TEXT,
    owner_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    license_number TEXT,
    logo_url TEXT,
    accent_color TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);
"""
