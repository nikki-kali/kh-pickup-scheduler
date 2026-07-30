# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This is not a standalone app — it's a **portable package** meant to be copied into two other repos:

- `backend/` → deploys as its own small Express service (Kings Highway Dental Laboratory's pickup-scheduler backend).
- `frontend/` → not a runnable app (no `package.json`, no build). It's components + a constants snippet + a wiring example meant to be copied into KH's actual marketing site repo and adapted to that site's real Tailwind theme, contact page, and constants file.

The code was ported from AIM Dental Laboratory's site/CRM (`aimdentallab.com`) and trimmed down to a single-brand, KH-only version. See `README.md` for the full list of what was deliberately removed or changed from AIM's original (multi-brand support, the Scanner Placement Program form branch, lead scoring, AIM's shipping CC line). When making changes, don't reintroduce multi-brand logic or re-couple this to AIM's CRM — the point of this package is that KH's backend stays fully separate.

## Commands

All commands run from `backend/` (the only part of this repo with a `package.json`):

```
npm install       # install deps
npm run dev       # run with --watch (auto-restart on file change)
npm start         # run without --watch
```

There is no lint config, no test suite, and no build step in this repo. Don't invent `npm test`/`npm run lint` commands — they don't exist.

## Setup for local dev

1. Create a Postgres DB and run `backend/db/schema.sql` against it.
2. Copy `backend/.env.example` to `backend/.env` and fill in `DATABASE_URL`, a freshly generated `PICKUP_ACTION_SECRET` (`openssl rand -hex 32` — never reuse AIM's), and `RESEND_API_KEY`.
3. `GET /health` confirms the server is up.

## Architecture

The backend is a small Express app with two public route groups mounted in `backend/src/app.js`, both **before** the app-wide `cors()`/`express.json()` middleware:

- `POST /api/web-leads` (`routes/webLeads.js`) — public, unauthenticated, IP-rate-limited endpoint hit by the marketing site's browser JS (Contact form *and* the Pickup scheduler both post here). It has its own scoped `cors()` + `express.json()`, which is *why* it must be mounted before the global ones — otherwise Express would already have answered the preflight before this route's own CORS could run. A submission is told apart as a pickup request purely by `caseType === 'Schedule Pickup'` (there's no separate `formType` field). Anti-spam is a honeypot field (`company`) plus the rate limiter — there's no API key, since a key embedded in public browser JS wouldn't add any security.
- `GET /api/leads/:id/pickup-action/:stage` (`routes/pickupAction.js`) — one-click links embedded in the internal staff-notification email, secured by an HMAC token (`pickupActionToken`, keyed by `PICKUP_ACTION_SECRET`) instead of a login session, since email links can't carry auth headers. Idempotent by design: re-clicking or clicking an earlier-stage link after a later one already fired just renders a static confirmation page without re-notifying anyone.

**Pickup lifecycle** (`services/pickupStatus.js`) is a 3-stage state machine tracked on the `leads` row itself (`pickup_status`: `requested` → `dispatched` → `received`, via `STAGE_ORDER`/`STAGE_COLUMN`):
1. `requested` — set on insert in `webLeads.js`; triggers an immediate confirmation email to the requester (stage 1, `pickupRequestedEmail`).
2. `dispatched` — set by `advancePickupStage()`, triggered by the staff "Mark Dispatched" email link.
3. `received` — set by `advancePickupStage()`, triggered by "Mark Received"; **auto-creates a placeholder row in `cases`** (case type `Other`, due in 3 days) since a pickup can contain multiple physical cases and staff must split/fill in real details manually afterward.

`advancePickupStage()` is deliberately idempotent (won't move backward or re-fire an already-reached stage) and treats the requester email + activity-log insert + case creation as best-effort side effects — none of them can fail the stage transition itself.

**Email** (`services/email.js`) sends via Resend by default; if `BREVO_API_KEY` is set and Resend errors, it falls back to Brevo's HTTPS API (Render blocks outbound SMTP, which is why this isn't a simple SMTP fallback). Email failures anywhere in the request lifecycle (`webLeads.js` notification, requester confirmations, stage-advance notifications) are swallowed/logged rather than failing the parent request — a saved lead that fails to email is recoverable; losing the DB write over a flaky email send is not.

**Case numbers** (`utils/caseNumber.js`) are always `KH-{year}-{count}` — this is the single-brand simplification from AIM's per-brand-prefix version.

**Rate limiting** (`middleware/rateLimiter.js`) is an in-memory, single-instance sliding-window limiter keyed by IP. It will not work correctly if the backend is ever scaled to multiple instances (state isn't shared) — swap for a shared store (Redis, etc.) if that becomes a requirement.

## Frontend package (reference only, not runnable here)

`PickupScheduler.jsx` is a 5-step wizard (practice → location → date/time → case details → review) that POSTs to `WEB_LEADS_API` (from `lib/constants.snippet.js`) with `caseType: 'Schedule Pickup'`. `PickupCalendar.jsx` is a hand-rolled date picker (no external calendar library) used in step 3.

When adapting these into KH's real site repo:
- Every `kh-teal` / `kh-deep` / `teal-mist` Tailwind class is a placeholder for KH's real theme tokens — swap them, don't leave them.
- Keep the `id="schedule-pickup"` wrapper and the hash-scroll `useEffect` shown in `ContactPickupSection.example.jsx` — `SCHEDULE_PICKUP_URL` (`/contact#schedule-pickup`) and every "Schedule Pickup" link sitewide depend on that exact id.
- `MagneticButton` and `useLocation`/react-router are assumed to already exist in KH's site codebase; they aren't part of this package.
- Merge `constants.snippet.js` into KH's existing `constants.js` rather than replacing it, and point `WEB_LEADS_API` at wherever the backend from this repo actually gets deployed.
