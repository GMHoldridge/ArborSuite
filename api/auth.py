from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from _lib.db import get_db, run_migrations
from _lib.auth import hash_pin, check_pin, create_token
from _lib.models import PinSetup, PinLogin, TokenResponse

app = FastAPI()

@app.post("/api/auth/setup")
async def setup_pin(body: PinSetup):
    """First-time PIN setup."""
    if len(body.pin) < 4:
        raise HTTPException(400, "PIN must be at least 4 digits")

    db = get_db()
    run_migrations()

    existing = db.execute("SELECT id FROM auth WHERE id = 1").fetchone()
    if existing:
        raise HTTPException(400, "PIN already set. Use /api/auth/login")

    db.execute("INSERT INTO auth (id, pin_hash) VALUES (1, ?)", [hash_pin(body.pin)])
    db.commit()

    return TokenResponse(token=create_token())

@app.post("/api/auth/login")
async def login(body: PinLogin):
    """Login with PIN, returns JWT."""
    db = get_db()
    run_migrations()

    row = db.execute("SELECT pin_hash FROM auth WHERE id = 1").fetchone()
    if not row:
        raise HTTPException(400, "No PIN set. Use /api/auth/setup first")

    if not check_pin(body.pin, row[0]):
        raise HTTPException(401, "Invalid PIN")

    return TokenResponse(token=create_token())

@app.get("/api/auth/check")
async def check_auth():
    """Check if PIN has been set up."""
    db = get_db()
    run_migrations()
    row = db.execute("SELECT id FROM auth WHERE id = 1").fetchone()
    return {"setup_complete": row is not None}
