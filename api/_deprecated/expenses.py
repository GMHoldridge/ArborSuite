from fastapi import FastAPI, HTTPException, Header
from _lib.db import get_db
from _lib.auth import require_auth
from _lib.models import ExpenseCreate

app = FastAPI()

def _auth(authorization: str | None):
    if not require_auth(authorization):
        raise HTTPException(401, "Unauthorized")

COLS = ["id", "job_id", "category", "amount", "description", "receipt_photo_url", "mileage_miles", "date", "created_at"]

@app.get("/api/expenses")
async def list_expenses(
    category: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    authorization: str | None = Header(None),
):
    _auth(authorization)
    db = get_db()
    query = "SELECT * FROM expenses WHERE 1=1"
    params = []
    if category:
        query += " AND category = ?"
        params.append(category)
    if date_from:
        query += " AND date >= ?"
        params.append(date_from)
    if date_to:
        query += " AND date <= ?"
        params.append(date_to)
    query += " ORDER BY date DESC"
    rows = db.execute(query, params).fetchall()
    return [dict(zip(COLS, row)) for row in rows]

@app.get("/api/expenses/summary")
async def expense_summary(year: int | None = None, authorization: str | None = Header(None)):
    """Get expense totals by category for tax purposes."""
    _auth(authorization)
    db = get_db()
    query = "SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses"
    params = []
    if year:
        query += " WHERE date LIKE ?"
        params.append(f"{year}-%")
    query += " GROUP BY category ORDER BY total DESC"
    rows = db.execute(query, params).fetchall()
    return [{"category": r[0], "total": r[1], "count": r[2]} for r in rows]

@app.post("/api/expenses")
async def create_expense(body: ExpenseCreate, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    cursor = db.execute(
        "INSERT INTO expenses (job_id, category, amount, description, receipt_photo_url, mileage_miles, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [body.job_id, body.category, body.amount, body.description, body.receipt_photo_url, body.mileage_miles, body.date],
    )
    db.commit()
    return {"id": cursor.lastrowid}

@app.delete("/api/expenses/{expense_id}")
async def delete_expense(expense_id: int, authorization: str | None = Header(None)):
    _auth(authorization)
    db = get_db()
    db.execute("DELETE FROM expenses WHERE id = ?", [expense_id])
    db.commit()
    return {"ok": True}
