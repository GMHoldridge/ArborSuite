from fastapi import FastAPI, HTTPException, Header
from _lib.db import get_db, run_migrations
from _lib.auth import require_auth
from _lib.models import ClientCreate, ClientResponse

app = FastAPI()

def _auth(authorization: str | None):
    if not require_auth(authorization):
        raise HTTPException(401, "Unauthorized")

@app.get("/api/clients")
async def list_clients(authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    rows = db.execute("SELECT * FROM clients ORDER BY name").fetchall()
    cols = ["id", "name", "phone", "email", "address", "lat", "lon", "notes", "created_at", "updated_at"]
    return [dict(zip(cols, row)) for row in rows]

@app.get("/api/clients/{client_id}")
async def get_client(client_id: int, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    row = db.execute("SELECT * FROM clients WHERE id = ?", [client_id]).fetchone()
    if not row:
        raise HTTPException(404, "Client not found")
    cols = ["id", "name", "phone", "email", "address", "lat", "lon", "notes", "created_at", "updated_at"]
    return dict(zip(cols, row))

@app.post("/api/clients")
async def create_client(body: ClientCreate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    cursor = db.execute(
        "INSERT INTO clients (name, phone, email, address, lat, lon, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [body.name, body.phone, body.email, body.address, body.lat, body.lon, body.notes],
    )
    db.commit()
    return {"id": cursor.lastrowid}

@app.put("/api/clients/{client_id}")
async def update_client(client_id: int, body: ClientCreate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    db.execute(
        "UPDATE clients SET name=?, phone=?, email=?, address=?, lat=?, lon=?, notes=?, updated_at=datetime('now') WHERE id=?",
        [body.name, body.phone, body.email, body.address, body.lat, body.lon, body.notes, client_id],
    )
    db.commit()
    return {"ok": True}

@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: int, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    db.execute("DELETE FROM clients WHERE id = ?", [client_id])
    db.commit()
    return {"ok": True}
