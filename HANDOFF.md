# ArborSuite — Handoff

## Status: SCAFFOLDING
- Project created at ~/Desktop/ArborSuite
- Directory structure in place
- Building Phase 1 MVP

## Current Step
Step 1: Scaffold — setting up project configs, frontend, backend foundation

## Key Decisions
- Turso for DB (SQLite edge, free tier)
- Vercel Blob for photos
- PIN + JWT auth (single user MVP)
- Claude vision API for tree photo assessment
- Weather.gov API (free, no key)
- PWA for Android support

## What's Next
- Frontend: Vite + React + Tailwind v4 + PWA
- Backend: FastAPI serverless functions
- DB schema + migrations

---

## 2026-06-26 — Status correction + estimate feature (session 16e36885)
**The "SCAFFOLDING" status above was WRONG.** App is ~85% built and RUNS. Verified by booting dev_server.py: PIN setup, login, and all 9 modules serve data.

**Selling to:** Geoff's boss **Max Yantachka / Kustom Tree Care Inc.** (Churchville NY, (585) 991-9289). Paid gig. Single-tenant now, multi-tenant-aware.

**Done this session (TESTED LOCALLY, not deployed):**
- Fixed DB thread-safety crash in api/_lib/db.py (was global sqlite singleton → "SQLite objects created in a thread" error). Now connection-per-request.
- Built the killer feature — estimate → email → READ-TRACKING → client APPROVES online:
  - db.py: quotes table + token/viewed_at/view_count/responded_at/client_note; additive ALTER migration for existing DBs; new `settings` table (business profile, seeded with Kustom Tree Care Inc.).
  - dev_server.py: POST /api/quotes/{id}/send, GET /api/public/quote/{token} (view tracking), POST /api/public/quote/{token}/respond, GET+PUT /api/settings; get_job now returns quote/assessment/invoice subobjects.
  - Frontend: JobDetail estimate card (Send/Resend + read-tracking status + copyable link), public QuoteView page (/quote/:token), SettingsPage (/settings), nav entry, types.
  - Verified end-to-end via TestClient: create→send→client views (view_count increments)→approve→job auto-advances quoted→scheduled. Frontend tsc + vite build clean.

**GOTCHAS for next session:**
- ⚠️ BUILD FROM CANONICAL PATH: run `npm run build` in `C:\Users\Ghold\Desktop\Projects\ArborSuite\frontend`, NOT the `Desktop\ArborSuite` junction — Vite path-resolution fails through the junction.
- Prod api/ folder still has only 11 of 45 routes — DEPLOY dev_server.py as ONE app, do NOT use per-file api/ serverless functions (they'd 404 crew/equipment/chemicals/route + all new estimate endpoints).
- requirements.txt missing libsql_experimental — add before deploy or Turso falls back to ephemeral sqlite.

**Still TODO:** add libsql to reqs + Turso setup; deploy; get Max's email (he uses Yahoo — needs app password for SMTP) + logo via Settings; strip demo data; test PWA install on real phone.

---

## 2026-06-26 (later) — DEPLOYED & VERIFIED
**LIVE: https://arborsuite.vercel.app** (Vercel: cavityfisters-projects/arborsuite). Turso DB: arborsuite-paradox52.aws-us-east-1.turso.io. Verified: UI 200, auth/check 200 from Turso, protected routes 401, full estimate flow works against cloud DB. Auth PIN cleared → first visitor sets it. Demo data + Kustom Tree Care settings seeded.

**Deploy quirks solved (don't re-learn):**
- Native libsql-experimental CRASHES on Vercel serverless → db.py uses stdlib HTTP shim over Turso /v2/pipeline. Turso args: floats=JSON number, ints=string.
- Vercel build needs `npm install --legacy-peer-deps` (vite8 vs @tailwindcss/vite peer conflict).
- Deploy: `vercel deploy --prod --yes` from project dir (GitHub auto-connect lacks perms; CLI upload works).
- FastAPI lifespan startup DOES run on Vercel.

**TODO for full features on prod:** set Vercel env ANTHROPIC_API_KEY (AI assess) + BLOB_READ_WRITE_TOKEN (photos); Max's Yahoo email+app-password (SMTP) + logo via Settings; strip demo data for real use.
