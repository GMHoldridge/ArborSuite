from fastapi import FastAPI, HTTPException, Header, UploadFile, File
from _lib.auth import require_auth
import os
import httpx
import base64

app = FastAPI()

@app.post("/api/upload")
async def upload_photo(
    file: UploadFile = File(...),
    job_id: int | None = None,
    photo_type: str = "assessment",
    authorization: str | None = Header(None),
):
    if not require_auth(authorization):
        raise HTTPException(401, "Unauthorized")

    blob_token = os.environ.get("BLOB_READ_WRITE_TOKEN")
    if not blob_token:
        raise HTTPException(500, "Photo storage not configured")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "File too large (max 10MB)")

    # Upload to Vercel Blob
    async with httpx.AsyncClient() as client:
        resp = await client.put(
            "https://blob.vercel-storage.com/" + (file.filename or "photo.jpg"),
            content=content,
            headers={
                "Authorization": f"Bearer {blob_token}",
                "x-content-type": file.content_type or "image/jpeg",
                "x-api-version": "7",
            },
        )
        if resp.status_code != 200:
            raise HTTPException(500, "Upload failed")
        data = resp.json()

    # Store in photos table if job_id provided
    if job_id:
        from _lib.db import get_db
        db = get_db()
        db.execute(
            "INSERT INTO photos (job_id, url, type) VALUES (?, ?, ?)",
            [job_id, data["url"], photo_type],
        )
        db.commit()

    return {"url": data["url"], "size": len(content)}
