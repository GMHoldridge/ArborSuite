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

**TODO for full features on prod:** BLOB_READ_WRITE_TOKEN (photos); Max's Yahoo email+app-password (SMTP) + logo via Settings; strip demo data for real use. (Anthropic API NOT used — see below.)

---

## 2026-06-27 — Planner scan + free local vision (NO paid API)
**Feature:** photograph handwritten notebook planner → extract jobs → review table → bulk-import clients/jobs/quotes. Verified end-to-end (scan 200 ~40s via tailnet, import created clients+jobs+quotes).
**Vision is FREE/local (Anthropic API banned until Max pays enough to justify):**
- _lib/vision.py: composite pattern (like warden/os_agent/vision.py). Planner OCR = qwen2.5vl:7b TRANSCRIBES the page → Claude CLI structures it (falls back to qwen2.5-coder / llama3.2 text models). Tree assessment = llava:7b. All via Ollama on :11435 (ARBOR_OLLAMA_URL).
- claude_vision.py no longer calls Anthropic SDK — delegates to _lib.vision.
- NOTE: VLMs flaky at emitting JSON arrays — that's why we transcribe-then-structure, not ask the VLM for JSON directly.
**Two-instance architecture (both share the same Turso DB):**
- CLOUD (Vercel, arborsuite.vercel.app): CRM always-on for Max. Vision endpoints return 503 (no Ollama there).
- DESKTOP (tailnet https://desktop-dm7rpgf.tail973c90.ts.net, runs dev_server.py with TURSO_* + ARBOR_OLLAMA_URL env): same app + WORKING vision. This is where Geoff scans the notebook / runs assessments. Data lands in Turso → Max sees it in cloud.
- Desktop instance started via: TURSO_DATABASE_URL/TURSO_AUTH_TOKEN/ARBOR_OLLAMA_URL env + `python dev_server.py` (port 8000), proxied by `tailscale serve`.
**Gotcha:** desktop instance uses dev-default JWT_SECRET, cloud uses its own — fine while OPEN (no PIN); if a PIN is ever set, align JWT_SECRET across both or tokens won't cross-validate.

## 2026-06-27 — Cloud scanning via outbound worker queue (no exposure)
Max can now scan from the CLOUD site. Verified end-to-end (~45s): POST cloud /api/planner/scan → {job_id,pending} → desktop worker processes → poll /api/vision-jobs/{id} → done.
- **Pattern:** cloud has no GPU, so /api/planner/scan ENQUEUES a row in `vision_jobs` (Turso). `vision_worker.py` on the desktop POLLS Turso outbound-only (no inbound exposure — this is why Tailscale Funnel/public tunnel was avoided; the approver kept blocking it and this is cleaner anyway). Worker runs scan_planner/assess_tree on Ollama, writes result back, clears image_b64.
- Desktop instance still processes inline (vision_available True). Frontend compresses image client-side (~1100px JPEG) then polls every 3s.
- **TWO desktop processes must stay running** (currently launched from a background shell — NOT yet auto-start): `dev_server.py` (port 8000, tailnet, Turso+Ollama env) and `vision_worker.py` (Turso+ARBOR_OLLAMA_URL env). On reboot these die → cloud scanning stops until restarted. TODO: make them auto-start (Windows Task at logon, or warden_services) — Geoff's PC is 24/7 + UPS incoming, but they still need to survive reboots. python-multipart must be in ROOT requirements.txt (Vercel installs that, not api/).
- **Anthropic API path (B)** = the always-on upgrade for when Max pays; flip vision to API on Vercel, drop the desktop dependency.

## 2026-06-27 — Auto-start via Windows Tasks (persistent)
Two scheduled tasks (at logon, no time limit, RestartCount 3) now run the desktop app + worker so they survive reboots:
- **"ArborSuite App"** → `powershell -WindowStyle Hidden -File C:\Users\Ghold\arborsuite-svc\launcher_app.ps1` (dev_server.py, port 8000)
- **"ArborSuite Vision Worker"** → `...\launcher_worker.ps1` (vision_worker.py)
- Launchers live in `C:\Users\Ghold\arborsuite-svc\` (OUTSIDE the git repo on purpose — they hold the Turso token; never commit). Logs: app.log / worker.log there.
- Manage: `Start-ScheduledTask`/`Stop-ScheduledTask -TaskName "ArborSuite App"`. To change env/token, edit the launcher .ps1 + restart the task.
- NOTE: venv python.exe is a shim → each launch shows 2 python procs (shim+real); expected, not a duplicate instance. Verified: clean restart via tasks → app up + cloud scan processed in ~38s.

## 2026-06-27 — Per-job weather alerts
Each upcoming job (next 7d, with coords) gets a wind/rain/storm/heat/freeze risk for ITS location + scheduled date. Existing weather.py risk logic (wind≥25=red, thunderstorm=red, rain%/heat/freeze=yellow) was already good — added: sync forecast_for_date (picks the job's day from weather.gov 7-day periods) + refresh_jobs_weather(db) storing weather_status+risk_score. /api/jobs/weather/refresh endpoint; dashboard returns weather_alerts; vision_worker refreshes every 30min; Dashboard "Weather Watch" card + manual ↻. Verified: risk engine flags 30mph/storm red; dashboard surfaces it. Uses job lat/lon → falls back to client coords.
**Gap/follow-up:** only jobs WITH coordinates get weather. → SOLVED 2026-06-27 by geocoding (below).

## 2026-06-27 — Address geocoding (closes the weather/route gap)
_lib/geocode.py: keyless geocode(address) → (lat,lon) via US Census geocoder, Nominatim fallback; best-effort (never raises). Auto-runs on client create/update (_maybe_geocode) + planner import; worker backfill_clients() each 30min cycle (before weather). Verified: Max's Churchville addr, Portland, Empire State Bldg all resolved correctly; client created via API auto-filled coords. Now scan-planner → clients w/ addresses → geocoded → jobs inherit client coords → weather alerts + route optimizer work. (Jobs use job.location_lat/lon, fall back to client coords.)

## 2026-06-27 — In-app roadmap + feature requests ("What's Coming")
Purpose: show Max what's on the way (sets expectations) + collect his ideas (the "do this/try this" loop). ROADMAP list is curated in dev_server.py (edit there: status 'coming'|'shipped'); **email is the #1 'coming' item** (his big complaint). feature_requests table + /api/roadmap + /api/feature-requests. Roadmap page (/roadmap, nav "💡 What's Coming"): suggest-an-idea box, Coming Soon, Recently Shipped, submitted ideas list. To add/reorder roadmap items just edit ROADMAP in dev_server.py + redeploy. Consider later: surface new requests on Geoff's dashboard + a status-update control.

## 2026-06-27 — Fixed tree assessment (was 405) + wired it to the free queue
Bug Geoff hit: "method not allowed" taking a tree photo. Causes: (1) NewAssessment posted to /api/upload which was retired in the single-app consolidation → SPA catch-all (GET only) → 405 on POST; (2) /api/assess still gated on ANTHROPIC_API_KEY → returned a hardcoded mock; (3) /api/assess/{id}/corrections didn't exist (would 405 on edit). Fix: tree assessment now mirrors planner — /api/assess/scan (multipart: inline on desktop via vision_available, else queue 'tree' vision_job), /api/assess/save (persist), /api/assess/{id}/corrections (added). NewAssessment: scan→poll /vision-jobs→save; stores a 640px JPEG thumbnail as photo_url (no Vercel Blob needed). Verified cloud end-to-end ~24s (llava). Real tree photo needed for real output (test used text image → "Maple"). worker already handled kind='tree'. The old /api/assess (mock) + api/_deprecated/upload.py remain unused.
