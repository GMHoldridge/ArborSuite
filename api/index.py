"""Vercel serverless entry — serves the ENTIRE ArborSuite backend as one
ASGI function. Vercel rewrites every /api/* request here (see vercel.json).

We deploy the single complete app (dev_server.py, all 45 routes) instead of the
old per-file functions, which only covered 11 routes. Files/dirs under /api that
start with '_' (e.g. _lib, _deprecated) are ignored by Vercel as functions but
remain importable."""
import sys, os

# Make project root importable so `dev_server` and `_lib` resolve.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dev_server import app, _seed_settings  # noqa: E402  (ASGI app Vercel serves)

# Serverless runtimes may skip lifespan startup events, so run schema + business
# settings seed here. All idempotent: CREATE IF NOT EXISTS + guarded ALTER/seed.
try:
    from _lib.db import run_migrations
    run_migrations()
    _seed_settings()  # business profile (Kustom Tree Care Inc.) on first run
except Exception:
    pass
