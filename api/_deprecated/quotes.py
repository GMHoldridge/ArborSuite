from fastapi import FastAPI, HTTPException, Header
import json
from _lib.db import get_db
from _lib.auth import require_auth
from _lib.models import QuoteCreate
from _lib.notifications import send_email, send_sms

app = FastAPI()

def _auth(authorization: str | None):
    if not require_auth(authorization):
        raise HTTPException(401, "Unauthorized")

@app.get("/api/quotes")
async def list_quotes(status: str | None = None, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    query = """SELECT q.*, c.name as client_name FROM quotes q
               JOIN jobs j ON q.job_id = j.id
               LEFT JOIN clients c ON j.client_id = c.id"""
    if status:
        query += " WHERE q.status = ?"
        rows = db.execute(query + " ORDER BY q.created_at DESC", [status]).fetchall()
    else:
        rows = db.execute(query + " ORDER BY q.created_at DESC").fetchall()
    cols = ["id", "job_id", "line_items", "total", "tax_rate", "notes", "sent_at", "status", "created_at", "client_name"]
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
    cursor = db.execute(
        "INSERT INTO quotes (job_id, line_items, total, tax_rate, notes) VALUES (?, ?, ?, ?, ?)",
        [body.job_id, json.dumps(items), total, body.tax_rate, body.notes],
    )
    db.commit()
    return {"id": cursor.lastrowid, "total": total}

@app.post("/api/quotes/{quote_id}/send")
async def send_quote(quote_id: int, method: str = "email", authorization: str | None = Header(None)):
    """Send a quote to the client via email or SMS."""
    _auth(authorization)
    db = get_db()
    row = db.execute(
        """SELECT q.*, c.name, c.email, c.phone, c.address FROM quotes q
           JOIN jobs j ON q.job_id = j.id
           JOIN clients c ON j.client_id = c.id WHERE q.id = ?""",
        [quote_id],
    ).fetchone()
    if not row:
        raise HTTPException(404, "Quote not found")

    line_items = json.loads(row[2]) if row[2] else []
    total = row[3]
    client_name = row[9]
    client_email = row[10]
    client_phone = row[11]

    sent = False
    if method == "email" and client_email:
        items_html = "".join(f"<li>{i['description']}: ${i['amount']:.2f}</li>" for i in line_items)
        body = f"<h2>Quote for {client_name}</h2><ul>{items_html}</ul><p><strong>Total: ${total:,.2f}</strong></p>"
        sent = await send_email(client_email, f"Quote - ${total:,.2f}", body)
    elif method == "sms" and client_phone:
        items_text = "\n".join(f"- {i['description']}: ${i['amount']:.2f}" for i in line_items)
        body = f"Quote for your tree work:\n{items_text}\nTotal: ${total:,.2f}"
        sent = await send_sms(client_phone, body)

    if sent:
        db.execute("UPDATE quotes SET sent_at = datetime('now'), status = 'sent' WHERE id = ?", [quote_id])
        db.commit()

    return {"sent": sent, "method": method}

@app.put("/api/quotes/{quote_id}/status")
async def update_quote_status(quote_id: int, status: str, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    db.execute("UPDATE quotes SET status = ? WHERE id = ?", [status, quote_id])
    db.commit()
    return {"ok": True}
