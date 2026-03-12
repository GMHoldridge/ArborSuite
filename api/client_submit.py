from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from _lib.db import get_db
from _lib.claude_vision import assess_tree_photo
import os
import httpx
import json
import secrets

app = FastAPI()

@app.post("/api/client-submit/create-link")
async def create_submission_link(job_id: int, authorization: str | None = None):
    """Owner creates a unique submission link to send to a client."""
    from _lib.auth import require_auth
    from fastapi import Header
    if not require_auth(authorization):
        raise HTTPException(401, "Unauthorized")

    token = secrets.token_urlsafe(32)
    db = get_db()
    # Store token in job description as metadata (simple approach for MVP)
    db.execute(
        "UPDATE jobs SET description = COALESCE(description, '') || '\n[SUBMIT_TOKEN:' || ? || ']' WHERE id = ?",
        [token, job_id],
    )
    db.commit()

    base_url = os.environ.get("VERCEL_URL", "localhost:5173")
    return {"token": token, "url": f"https://{base_url}/submit/{token}", "job_id": job_id}

@app.post("/api/client-submit/{token}")
async def client_submit(
    token: str,
    notes: str = Form(""),
    file: UploadFile = File(...),
):
    """Client uploads a photo via unique link. No auth required."""
    db = get_db()

    # Find the job with this token
    row = db.execute(
        "SELECT id FROM jobs WHERE description LIKE ?", [f"%[SUBMIT_TOKEN:{token}]%"]
    ).fetchone()
    if not row:
        raise HTTPException(404, "Invalid or expired link")
    job_id = row[0]

    # Upload photo
    blob_token = os.environ.get("BLOB_READ_WRITE_TOKEN")
    if not blob_token:
        raise HTTPException(500, "Storage not configured")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10MB)")

    async with httpx.AsyncClient() as client:
        resp = await client.put(
            "https://blob.vercel-storage.com/" + (file.filename or "client_photo.jpg"),
            content=content,
            headers={
                "Authorization": f"Bearer {blob_token}",
                "x-content-type": file.content_type or "image/jpeg",
                "x-api-version": "7",
            },
        )
        if resp.status_code != 200:
            raise HTTPException(500, "Upload failed")
        photo_url = resp.json()["url"]

    # Store the photo
    db.execute(
        "INSERT INTO photos (job_id, url, type, caption) VALUES (?, ?, 'assessment', ?)",
        [job_id, photo_url, notes],
    )

    # Auto-run AI assessment
    try:
        result = await assess_tree_photo(photo_url, notes)
        db.execute(
            """INSERT INTO assessments (job_id, photo_url, ai_response, species, height_est, difficulty, time_est_hours, equipment_needed, hazards)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [job_id, photo_url, json.dumps(result), result.get("species"),
             result.get("height_estimate_ft"), result.get("difficulty_rating"),
             result.get("time_estimate_hours"), json.dumps(result.get("equipment_suggested", [])),
             json.dumps(result.get("hazards", []))],
        )
    except Exception:
        pass  # Assessment can be run manually later

    db.commit()
    return {"ok": True, "message": "Photo received! The arborist will review and get back to you."}
