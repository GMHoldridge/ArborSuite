from fastapi import FastAPI, HTTPException, Header
from _lib.db import get_db
from _lib.auth import require_auth
from _lib.models import JobCreate, JobUpdate

app = FastAPI()

def _auth(authorization: str | None):
    if not require_auth(authorization):
        raise HTTPException(401, "Unauthorized")

COLS = ["id", "client_id", "status", "title", "description", "scheduled_date",
        "scheduled_time", "weather_status", "risk_score", "location_lat", "location_lon",
        "created_at", "updated_at"]

@app.get("/api/jobs")
async def list_jobs(status: str | None = None, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    if status:
        rows = db.execute(
            "SELECT j.*, c.name as client_name FROM jobs j LEFT JOIN clients c ON j.client_id = c.id WHERE j.status = ? ORDER BY j.scheduled_date",
            [status],
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT j.*, c.name as client_name FROM jobs j LEFT JOIN clients c ON j.client_id = c.id ORDER BY j.scheduled_date"
        ).fetchall()
    return [dict(zip(COLS + ["client_name"], row)) for row in rows]

@app.get("/api/jobs/{job_id}")
async def get_job(job_id: int, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    row = db.execute(
        "SELECT j.*, c.name as client_name FROM jobs j LEFT JOIN clients c ON j.client_id = c.id WHERE j.id = ?",
        [job_id],
    ).fetchone()
    if not row:
        raise HTTPException(404, "Job not found")
    return dict(zip(COLS + ["client_name"], row))

@app.post("/api/jobs")
async def create_job(body: JobCreate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    cursor = db.execute(
        "INSERT INTO jobs (client_id, title, description, scheduled_date, scheduled_time, location_lat, location_lon) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [body.client_id, body.title, body.description, body.scheduled_date, body.scheduled_time, body.location_lat, body.location_lon],
    )
    db.commit()
    return {"id": cursor.lastrowid}

@app.put("/api/jobs/{job_id}")
async def update_job(job_id: int, body: JobUpdate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    updates = []
    values = []
    for field, val in body.model_dump(exclude_none=True).items():
        updates.append(f"{field} = ?")
        values.append(val)
    if not updates:
        raise HTTPException(400, "No fields to update")
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
