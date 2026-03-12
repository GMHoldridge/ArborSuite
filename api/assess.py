from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import json
from _lib.db import get_db
from _lib.auth import require_auth
from _lib.claude_vision import assess_tree_photo

app = FastAPI()

class AssessRequest(BaseModel):
    photo_url: str
    job_id: Optional[int] = None
    client_notes: Optional[str] = ""

@app.post("/api/assess")
async def assess(body: AssessRequest, authorization: str | None = Header(None)):
    if not require_auth(authorization):
        raise HTTPException(401, "Unauthorized")

    try:
        result = await assess_tree_photo(body.photo_url, body.client_notes or "")
    except Exception as e:
        raise HTTPException(500, f"AI assessment failed: {str(e)}")

    db = get_db()
    cursor = db.execute(
        """INSERT INTO assessments (job_id, photo_url, ai_response, species, height_est, difficulty, time_est_hours, equipment_needed, hazards)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            body.job_id,
            body.photo_url,
            json.dumps(result),
            result.get("species"),
            result.get("height_estimate_ft"),
            result.get("difficulty_rating"),
            result.get("time_estimate_hours"),
            json.dumps(result.get("equipment_suggested", [])),
            json.dumps(result.get("hazards", [])),
        ],
    )
    db.commit()

    return {"id": cursor.lastrowid, "assessment": result}

@app.get("/api/assess/{assessment_id}")
async def get_assessment(assessment_id: int, authorization: str | None = Header(None)):
    if not require_auth(authorization):
        raise HTTPException(401, "Unauthorized")

    db = get_db()
    row = db.execute("SELECT * FROM assessments WHERE id = ?", [assessment_id]).fetchone()
    if not row:
        raise HTTPException(404, "Assessment not found")

    cols = ["id", "job_id", "photo_url", "ai_response", "owner_corrections",
            "species", "height_est", "difficulty", "time_est_hours", "equipment_needed", "hazards", "created_at"]
    data = dict(zip(cols, row))
    if data["ai_response"]:
        data["ai_response"] = json.loads(data["ai_response"])
    if data["owner_corrections"]:
        data["owner_corrections"] = json.loads(data["owner_corrections"])
    if data["equipment_needed"]:
        data["equipment_needed"] = json.loads(data["equipment_needed"])
    if data["hazards"]:
        data["hazards"] = json.loads(data["hazards"])
    return data

@app.put("/api/assess/{assessment_id}/corrections")
async def save_corrections(assessment_id: int, corrections: dict, authorization: str | None = Header(None)):
    """Owner saves corrections to the AI assessment."""
    if not require_auth(authorization):
        raise HTTPException(401, "Unauthorized")

    db = get_db()
    db.execute(
        "UPDATE assessments SET owner_corrections = ? WHERE id = ?",
        [json.dumps(corrections), assessment_id],
    )
    db.commit()
    return {"ok": True}
