"""ArborSuite vision worker — runs on Geoff's desktop (has the GPU/Ollama).

Polls the shared Turso DB for pending vision_jobs (queued by the cloud Vercel
app when Max scans from his phone), runs them locally on the GPU for free, and
writes results back. OUTBOUND ONLY — no inbound port, nothing exposed.

Run:  TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... ARBOR_OLLAMA_URL=http://localhost:11435 \
      python vision_worker.py
"""
import os
import sys
import json
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "api"))

from _lib.db import get_db                       # noqa: E402
from _lib.vision import scan_planner, assess_tree, vision_available  # noqa: E402

POLL_SECONDS = float(os.environ.get("VISION_POLL_SECONDS", "3"))


def _process(kind: str, image_b64: str):
    if kind == "planner":
        return scan_planner(image_b64)
    if kind == "tree":
        return assess_tree(image_b64)
    raise ValueError(f"unknown job kind: {kind}")


def main():
    if not os.environ.get("TURSO_DATABASE_URL"):
        print("WARN: no TURSO_DATABASE_URL — worker would poll local sqlite, not the cloud DB", flush=True)
    if not vision_available():
        print("FATAL: Ollama not reachable at ARBOR_OLLAMA_URL — vision can't run here", flush=True)
        sys.exit(1)
    print(f"vision_worker up — polling every {POLL_SECONDS}s", flush=True)
    last_weather = 0.0
    while True:
        # Periodic geocode backfill + weather refresh (every 30 min)
        if time.time() - last_weather > 1800:
            try:
                from _lib.geocode import backfill_clients
                n = backfill_clients(get_db())
                if n:
                    print(f"geocoded {n} client(s)", flush=True)
            except Exception as e:
                print(f"geocode error: {e}", flush=True)
            try:
                from _lib.weather import refresh_jobs_weather
                alerts = refresh_jobs_weather(get_db())
                print(f"weather refreshed — {len(alerts)} job(s) at risk", flush=True)
            except Exception as e:
                print(f"weather refresh error: {e}", flush=True)
            last_weather = time.time()
        try:
            db = get_db()
            row = db.execute(
                "SELECT id, kind, image_b64 FROM vision_jobs WHERE status='pending' ORDER BY id LIMIT 1"
            ).fetchone()
            if not row:
                time.sleep(POLL_SECONDS)
                continue
            job_id, kind, image_b64 = row
            db.execute("UPDATE vision_jobs SET status='processing', updated_at=datetime('now') WHERE id=?", [job_id])
            db.commit()
            print(f"job {job_id} ({kind}) processing…", flush=True)
            try:
                result = _process(kind, image_b64)
                db2 = get_db()
                db2.execute(
                    "UPDATE vision_jobs SET status='done', result=?, image_b64='', updated_at=datetime('now') WHERE id=?",
                    [json.dumps(result), job_id],
                )
                db2.commit()
                print(f"job {job_id} done ({len(result) if isinstance(result, list) else 1} items)", flush=True)
            except Exception as e:
                db3 = get_db()
                db3.execute(
                    "UPDATE vision_jobs SET status='error', error=?, image_b64='', updated_at=datetime('now') WHERE id=?",
                    [str(e)[:500], job_id],
                )
                db3.commit()
                print(f"job {job_id} ERROR: {e}", flush=True)
        except Exception as loop_err:
            print(f"poll error: {loop_err}", flush=True)
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
