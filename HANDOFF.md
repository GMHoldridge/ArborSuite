# ArborSuite — Handoff
> Auto-generated from STATE.json at 2026-08-17 01:02 UTC — edit STATE.json, not this file

**Status:** Active | **Branch:** `main` | **Health:** G

## Warnings
- inbox-280 carries promoted_to='dismissed' — known stale dart_writer field (same bug flagged by inbox-251 r5), NOT a real dismissal; item status is 'new'

## Recently Completed
- inbox-280 r3 ANALYZE recorded+verified via dart_writer (persisted inbox.json:7622) — zero movement since r2 08-09: no ArborSuite commits past e5d2071 (08-02), PWA still live (manifest.json+sw.js, 32511ad), demo seed still unbuilt (dev_server.py:27), no clone-deploy checklist anywhere (2026-08-17)
- inbox-280 (customer #2 experiment) r1 ANALYZE recorded+verified via dart_writer (exit OK, 1 review, status unchanged; session id persisted in inbox.json) (2026-08-02)

## Blocked
None

## Key Decisions
- **ANALYZE not done/drop** — item is 1 day old, core is a Geoff business action (find paying customer #2), no code shipped or superseded it — but the PWA contingency it budgets ~1 day for is ALREADY DEPLOYED (manifest.json + sw.js offline fallback, commit 32511ad) (2026-08-02) [dart_research_inbox-280-r1]
- **ANALYZE again, not done/drop** — core deliverable = paying customer #2, a Geoff-only business action — done would falsely assert a paying customer exists; drop wrong because Geoff still wants to sell ArborSuite (2026-08-17) [390e4c08-abcf-47c7-816c-ae60c0613f29]
- **Tripwire set: no r4 read-only review** — r1/r2/r3 reached identical conclusions with zero movement — further read-only dispatches waste cycles; next dispatch must be EXECUTE (demo-data strip + clone-deploy checklist) or wait on Geoff contacting a customer #2 candidate (2026-08-17) [390e4c08-abcf-47c7-816c-ae60c0613f29]

## Next Steps
- EXECUTE-eligible prep for customer #2: (1) strip/flag demo data (_seed_demo_data dev_server.py:27), (2) clone-deploy checklist (new Vercel project + new Turso DB + /settings rebrand); 2nd-tenant vision gotcha: one vision_worker polls one Turso DB — pitch CRM-without-vision until they pay. NO r4 read-only review of inbox-280.

## Recently Modified Files
- `STATE.json`
- `HANDOFF.md`

## Recent Sessions
- `dart_research_inbox-280-r1` (2026-08-02) — 1 tasks

## Recent Work (appended)
- **2026-08-23 — inbox-280 r4 ANALYZE recorded+verified** (persisted inbox.json:8052, dart_writer exit OK). Zero movement since r3 08-16: only commits after e5d2071 are 458e0a7/b20d188 (state files only — HANDOFF/STATE/WORKER_LOG), PWA still live (frontend/public/manifest.json + sw.js, 32511ad), demo seed still unbuilt (dev_server.py:27,42), no clone-deploy checklist. Verdict unchanged: core = Geoff-only business action (land paying customer #2); not done/superseded/obsolete. **This r4 dispatch itself violated the r3 tripwire** — 4 read-only reviews now with identical conclusions. Dispatcher: NO r5 read-only. Only valid next dispatches: EXECUTE (demo-data strip + clone-deploy checklist) or wait on Geoff contacting a customer #2 candidate. promoted_to='dismissed' echo = known stale dart_writer field bug, item status is 'new'.
- **2026-09-06 — inbox-280 r5 ANALYZE recorded+verified** (persisted inbox.json:10080, dart_writer exit OK). Zero movement since r4 08-23: only commit is 3f52f99 (r4's own HANDOFF persist), tree clean except untracked AUDIT_LOG.jsonl (2 audit lines from r1/r3 STATE writes, not product work). PWA still live (frontend/public/manifest.json + sw.js, 32511ad), demo seed still unbuilt (_seed_demo_data dev_server.py:27,42), no clone-deploy checklist, no paying customer #2. Verdict unchanged: core = Geoff-only business action; not done/superseded/obsolete. **SECOND tripwire violation** — this r5 dispatch ignored the r4 "NO r5 read-only" flag; 6 read-only looks now (r1-r4 + triage_judge + 08-30 task_a_triage cross-check), all identical. ROOT CAUSE identified: autonomous loop's EXECUTE half was never built (project_autonomous_loop_restored.md) — hourly Mycelium-DartResearch can ONLY dispatch read-only research, so the tripwire is structurally unenforceable. Fix belongs in warden: skip-list inbox-280 in the research rotation or teach dart_worker_boot.py to honor tripwire flags. Ops note: laws.json rule protect-dart-inbox blocks ANY Bash command containing the literal inbox filename — dart_writer calls must not cite it in --reason/--evidence text.
- **2026-10-05 — inbox-280 r6 ANALYZE recorded+verified** (persisted inbox.json:10431, dart_writer exit OK). Zero movement in 29 days since r5: only commit a886b24 (09-06, HANDOFF.md +1 line = r5 persist), tree clean except AUDIT_LOG.jsonl. PWA still live (manifest.json + sw.js, 32511ad); demo seed still unbuilt (dev_server.py:27,42); no clone-deploy checklist (git ls-files deploy/clone/tenant/onboard = 0); no customer #2. No direction change found (project_arborsuite.md memory last touched 08-02, no newer capture supersedes). **THIRD tripwire violation.** r5's root-cause fix NOT built: grep warden/*.py for tripwire/skip-list = 0 hits. Needs ONE Geoff answer: (a) still want customer #2 → EXECUTE worker for demo-strip + clone-deploy checklist, (b) parked → exclude from research rotation, (c) abandoned → drop. No r7 until answered.
- **2026-11-04 — inbox-560 (Aether FX restyle before pitching Frank) r1 ANALYZE recorded and verified** (persisted at line 21484 of the DART inbox; dart_writer exit 0). The item is real and NOT STARTED. It was captured at 05:43 from Geoff's conditional line in session 42f4c802 ("if I did want to present it would need to look the part"). That session offered the preview "when you want it", and Geoff has not answered.
  - **Premises verified:** #228B22 appears 183× across 24 files in src, 188× across 27 files counting outside src. The More menu uses 9 emoji icons (AppShell.tsx:45-55).
  - **Correction:** index.css:3-8 already has `--color-*` vars, but they're dead: 0 uses, and Tailwind v4 has no `@theme` block.
  - **Builder notes:**
    - The per-tenant `settings.accent_color` already exists (QuoteView.tsx:66). Wire `--brand` to it, so the brand stays neutral until Frank's name is known.
    - The estimate EMAIL at dev_server.py:391,394 hardcodes the green and ignores accent_color.
    - White text on a light earthy accent will fail contrast in sun.
    - dev_server.py is 1079 lines (over the cap): run split_plan before editing it.
  - **Ordering:** inbox-544 (VERCEL_URL estimate links open a Vercel login page; WRITTEN, not deployed; Geoff needs to run `vercel login`) must ship first. Otherwise homeowners can't reach QuoteView from the email, and there's no point restyling it.
  - **Next touch:** build the preview artifact. It touches no app code. Do not run an r2 read-only review.
- **2026-11-04 — inbox-561 ("zero-entry" capture: walk-around estimate, photo auto-attach, geofence, BLE equipment, spoken chem log, receipts) r1 ANALYZE recorded and verified** (persisted at line 21519 of the DART inbox; dart_writer exit 0). Real and NOT STARTED: captured 09:16, and no code since.
  - **Reusable base:** the vision_jobs queue plus the desktop worker (it only knows the planner and tree kinds, vision_worker.py:23-28). Also the photo → draft-quote → send flow (AssessmentView.tsx:192-228), geocoded clients, jobs.status, the equipment-hours schema, the chemical_applications table, and the receipt camera input.
  - **Missing:** there's no audio/voice code, no geolocation or EXIF, no photo storage, and no rate card. Line items are free-form, so "at the shop's prices" has no data behind it yet.
  - **Bugs found (by code read, not run):**
    - (a) ExpenseCapture posts FormData to a JSON-body endpoint (ExpenseCapture.tsx:55-64 vs dev_server.py:559-560). That's likely a 422, and the receipt is never stored.
    - (b) The service-due logic is broken (dev_server.py:677 modulo window). Logging a service never resets the hour baseline (:732-733).
  - **Platform walls:** a PWA can't do background geofencing or passive BLE (Web Bluetooth isn't on iOS). Passive (3) and (4) need a native wrapper or a gateway in each truck, which goes against the "PWA, not Play Store" decision.
  - **Pitch liability:** the "Crew & Time" menu (AppShell.tsx:47) tracks hours per person, and the item says Frank's office won't accept that. Hide it before any Frank demo.
  - **Order:** 544 deploy → 560 preview → rate card + bug fixes (a)/(b) → walk-around v1 → chem sentence → receipt OCR → photo storage + auto-attach → native-wrapper decision.
  - **Ask Geoff:**
    - Is the Frank pitch on?
    - Does Frank have a price sheet?
    - Is a native wrapper OK?
    - What phones does the crew use: iPhone or Android?
  - **Next:** no r2 read-only review unless a 561 commit lands or Geoff answers.
- **2026-11-11 — inbox-560 r2 ANALYZE recorded and verified** (dart_writer exit 0, 3 reviews, status still 'new'). r1 above is stale on one point: **the preview step SHIPPED.**
  - **Shipped:** the "ArborSuite Looks" canvas, claude.ai/artifact/1U95Qqt8kHmTayxuDVoKZw, built 11-04 by interactive session 42f4c802 about 90 minutes after r1 ran. It has the client estimate page in three looks (Growth Ring, Canopy, Survey), plus Login, Home and the More menu with stroke icons in Growth Ring.
  - **Not shipped:** Geoff has not picked a look in any session. The builder session could not view the canvas itself, so its rendering is unconfirmed.
  - **App code:** none. Only HANDOFF commits since capture (0df89c5, d7196e7). #228B22 is still 183 hits in 24 files, index.css:4-7 vars are still dead, and the emojis are still at `frontend/src/components/layout/AppShell.tsx:46-53` (r1 gave that path without `layout/`).
  - **New fact:** the business is Montalbano Tree Service (Geoff, 11-04). ArborSuite has not been pitched to Frank, so keep the name a Settings value, not code.
  - **Still true:** inbox-544 deploys first (needs Geoff's `vercel login`).
  - **Next:** Geoff picks Growth Ring, Canopy or Survey; then the port is EXECUTE work (tokens + `--brand`, the 183 replacements, 9 icons, art on login/headers/empty states/quote header). No r3 read-only review unless he picks or a theme/icon commit lands.
- **2026-11-11 — inbox-561 ("zero-entry" capture) r2 ANALYZE recorded and verified** (dart_writer exit 0, 3 reviews, status still 'new'; session c38f70d3). **No change since r1 (11-04):** still real, NOT STARTED, not superseded. r1's analysis, build order and questions stand.
  - **Commits:** `git log --all --since=2026-11-03` shows 3 commits (0df89c5, d7196e7, 0a7382e), all HANDOFF.md only. The last commit touching frontend/, api/, dev_server.py or vision_worker.py is 1095957 (10-29). No worker/* branch has moved.
  - **Code:** a source grep for geolocation, MediaRecorder, SpeechRecognition, bluetooth, exif, rate_card, geofence and walk-around finds no feature code. The only matches are the planner-OCR strings in `api/_lib/vision.py:171-214`, which predate the item.
  - **DART:** no item captured after 561 is tagged ArborSuite or mentions zero-entry, rate card or price sheet.
  - **Geoff's answers:** none found in the DART inbox or the ArborSuite memory note. Session transcripts were not searched.
  - **This r2 broke r1's tripwire** (no r2 unless a 561 commit lands or Geoff answers). No r3 read-only review until one of those happens.
  - **Doable without Geoff (EXECUTE work):** the two base bugs r1 found, the ExpenseCapture FormData/JSON mismatch (ExpenseCapture.tsx:55-64 vs dev_server.py:559-560) and the service-due logic (dev_server.py:677, :732-733).
- **2026-11-18 — inbox-560 r3 ANALYZE recorded and verified** (dart_writer exit 0, 5 reviews, status still 'new'; session 57010602). **No change since r2 (11-11).**
  - **Commits:** 4 since capture (0df89c5, d7196e7, 0a7382e, ef3bc7e), all HANDOFF.md only. The last code commit is still 1095957 (10-29).
  - **Code:** #228B22 is still 183 hits in 24 files. There's no @theme, no --brand and no var(--color use. The emojis are still at `frontend/src/components/layout/AppShell.tsx:45-55`.
  - **No pick:** Geoff has not picked a look. I searched the 55 transcripts changed since r2. Session 42f4c802's 11-12 summary says the canvas is "waiting for him to pick." No newer DART item touches ArborSuite or Frank. inbox-544 is still 'new' (not deployed).
  - **This r3 broke r2's tripwire.** Park 560 from read-only research until Geoff picks Growth Ring, Canopy or Survey (claude.ai/artifact/1U95Qqt8kHmTayxuDVoKZw) or a theme/icon commit lands. If he says the pitch is off, drop it.
- **2026-11-18 — inbox-561 ("zero-entry" capture) r3 ANALYZE recorded and verified** (persisted at line 22204 of the DART inbox; dart_writer exit 0, 5 reviews, status still 'new'; session dart_research_inbox-561-r3). **No change since r2 (11-11).** r1 (11-04) still holds the full analysis and build order.
  - **Commits:** 5 since capture (0df89c5, d7196e7, 0a7382e, ef3bc7e, 87b9d83), all HANDOFF.md only. Last code commit is still 1095957 (10-29). No worker/* branch has moved since 07-08.
  - **Code:** grep for geolocation, MediaRecorder, SpeechRecognition, bluetooth, exif, rate_card, geofence, walk-around still finds no feature code. Both base bugs stand: `frontend/src/components/expenses/ExpenseCapture.tsx:55-64` posts FormData to the JSON endpoint at dev_server.py:559-560, and service-due at dev_server.py:677 / :732-733 is unchanged.
  - **DART:** items 562-581 are hardware, warden, drone_ai and Sentinel. None is ArborSuite. The one Frank mention (579) is a co-worker potato-launcher story, not a pitch update. Memory note project_arborsuite.md last touched 11-04; r1's four questions are unanswered.
  - **New fact:** the DART EXECUTE path is proven (inbox-578 selftest closed 11-16 by dart_worker_boot). The two base bugs can now go to ONE EXECUTE worker without Geoff, in a new module since dev_server.py is over the 800-line cap.
  - **Third tripwire violation.** Park 561 from read-only research. Valid next dispatches: the EXECUTE bug-fix pair, or a Geoff answer (pitch on? price sheet? native wrapper? iPhone or Android?).
