from fastapi import FastAPI, HTTPException, Header
from _lib.db import get_db
from _lib.auth import require_auth

app = FastAPI()

@app.get("/api/dashboard")
async def dashboard(authorization: str | None = Header(None)):
    if not require_auth(authorization):
        raise HTTPException(401, "Unauthorized")

    db = get_db()

    # Job counts by status
    job_counts = {}
    for row in db.execute("SELECT status, COUNT(*) FROM jobs GROUP BY status").fetchall():
        job_counts[row[0]] = row[1]

    # Unpaid invoices
    unpaid = db.execute(
        "SELECT COUNT(*), COALESCE(SUM(total - paid_amount), 0) FROM invoices WHERE status != 'paid'"
    ).fetchone()

    # This month's revenue
    revenue = db.execute(
        "SELECT COALESCE(SUM(paid_amount), 0) FROM invoices WHERE paid_at LIKE strftime('%Y-%m', 'now') || '%'"
    ).fetchone()

    # This month's expenses
    expenses = db.execute(
        "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date LIKE strftime('%Y-%m', 'now') || '%'"
    ).fetchone()

    # Upcoming jobs (next 7 days)
    upcoming = db.execute(
        """SELECT j.id, j.title, j.scheduled_date, c.name as client_name
           FROM jobs j LEFT JOIN clients c ON j.client_id = c.id
           WHERE j.status IN ('scheduled', 'quoted')
           AND j.scheduled_date BETWEEN date('now') AND date('now', '+7 days')
           ORDER BY j.scheduled_date LIMIT 5"""
    ).fetchall()

    return {
        "job_counts": job_counts,
        "unpaid_invoices": {"count": unpaid[0], "total": unpaid[1]},
        "month_revenue": revenue[0],
        "month_expenses": expenses[0],
        "month_profit": revenue[0] - expenses[0],
        "upcoming_jobs": [
            {"id": r[0], "title": r[1], "date": r[2], "client": r[3]}
            for r in upcoming
        ],
    }
