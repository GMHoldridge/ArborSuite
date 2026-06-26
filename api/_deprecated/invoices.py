from fastapi import FastAPI, HTTPException, Header
import json
from _lib.db import get_db
from _lib.auth import require_auth
from _lib.models import InvoiceCreate, InvoiceUpdate

app = FastAPI()

def _auth(authorization: str | None):
    if not require_auth(authorization):
        raise HTTPException(401, "Unauthorized")

COLS = ["id", "job_id", "quote_id", "total", "paid_amount", "paid_at", "payment_method", "status", "created_at"]

@app.get("/api/invoices")
async def list_invoices(status: str | None = None, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    query = """SELECT i.*, c.name as client_name FROM invoices i
               JOIN jobs j ON i.job_id = j.id
               LEFT JOIN clients c ON j.client_id = c.id"""
    if status:
        rows = db.execute(query + " WHERE i.status = ? ORDER BY i.created_at DESC", [status]).fetchall()
    else:
        rows = db.execute(query + " ORDER BY i.created_at DESC").fetchall()
    return [dict(zip(COLS + ["client_name"], row)) for row in rows]

@app.post("/api/invoices")
async def create_invoice(body: InvoiceCreate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    cursor = db.execute(
        "INSERT INTO invoices (job_id, quote_id, total) VALUES (?, ?, ?)",
        [body.job_id, body.quote_id, body.total],
    )
    # Update job status
    db.execute("UPDATE jobs SET status = 'invoiced', updated_at = datetime('now') WHERE id = ?", [body.job_id])
    db.commit()
    return {"id": cursor.lastrowid}

@app.post("/api/invoices/from-quote/{quote_id}")
async def invoice_from_quote(quote_id: int, authorization: str | None = Header(None)):
    """One-tap: convert a quote into an invoice."""
    _auth(authorization)
    db = get_db()
    quote = db.execute("SELECT job_id, total FROM quotes WHERE id = ?", [quote_id]).fetchone()
    if not quote:
        raise HTTPException(404, "Quote not found")

    cursor = db.execute(
        "INSERT INTO invoices (job_id, quote_id, total) VALUES (?, ?, ?)",
        [quote[0], quote_id, quote[1]],
    )
    db.execute("UPDATE jobs SET status = 'invoiced', updated_at = datetime('now') WHERE id = ?", [quote[0]])
    db.commit()
    return {"id": cursor.lastrowid, "total": quote[1]}

@app.put("/api/invoices/{invoice_id}")
async def update_invoice(invoice_id: int, body: InvoiceUpdate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    updates = []
    values = []
    for field, val in body.model_dump(exclude_none=True).items():
        updates.append(f"{field} = ?")
        values.append(val)

    if body.status == "paid":
        updates.append("paid_at = datetime('now')")
        # Also update job status
        inv = db.execute("SELECT job_id FROM invoices WHERE id = ?", [invoice_id]).fetchone()
        if inv:
            db.execute("UPDATE jobs SET status = 'paid', updated_at = datetime('now') WHERE id = ?", [inv[0]])

    if updates:
        values.append(invoice_id)
        db.execute(f"UPDATE invoices SET {', '.join(updates)} WHERE id = ?", values)
        db.commit()
    return {"ok": True}
