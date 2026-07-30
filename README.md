# Kings Highway Dental Laboratory — Pickup Scheduler

Ported from AIM Dental Laboratory's site (aimdentallab.com) and rebranded/
trimmed for a standalone KH backend, per your decision to keep KH's backend
fully separate from AIM's CRM rather than sharing it.

## What's here

```
frontend/
  components/contact/PickupScheduler.jsx   the 5-step wizard
  components/contact/PickupCalendar.jsx    hand-rolled calendar (step 3)
  lib/constants.snippet.js                 constants to merge into KH's own constants.js
  pages/ContactPickupSection.example.jsx   reference for wiring it into KH's Contact page

backend/
  src/app.js                Express app — mounts both public routes
  src/index.js              entry point
  src/config/db.js          Postgres pool
  src/routes/webLeads.js    POST /api/web-leads — saves the lead, sends staff + requester emails
  src/routes/pickupAction.js  GET /api/leads/:id/pickup-action/:stage — one-click dispatch/received links
  src/services/email.js     Resend-based email sending + the 3 requester-facing templates
  src/services/pickupStatus.js  stage-advance logic, idempotent, auto-creates a case on "received"
  src/middleware/rateLimiter.js
  src/middleware/errorHandler.js
  src/utils/caseNumber.js
  db/schema.sql             leads/cases/activities tables this needs
  package.json / .env.example
```

## What was changed from AIM's version

- **Single-brand, not multi-brand.** AIM's backend runs multiple brands
  through one CRM (a `brand` column, per-brand case-number prefixes). This
  version drops that — it's just KH, so `caseNumber.js` always prefixes
  `KH-`.
- **Scanner Program branch removed.** AIM's `webLeads.js` also handled a
  second form type (`Scanner Placement Program`) with its own routing. Only
  the Contact/Pickup path is kept here — add a branch back if KH ever needs
  an equivalent form.
- **Lead scoring removed.** AIM's `ai_score`/`scoreFromLead()` is a broader
  CRM feature, not part of the pickup scheduler itself — left out to keep
  this package self-contained. Port `services/scoring.js` from
  `aim-crm-backend` separately if KH wants it.
- **`shipping@khdentallab.com` CC line removed** — that existed in AIM's CC
  list to notify KH's own shipping team of AIM pickups. Doesn't apply here;
  set `PICKUP_FORM_CC` in `.env` to whatever KH's own internal routing
  should be.
- **All copy/branding updated** — emails say "Kings Highway Dental
  Laboratory" and use KH's real brand blue (`#31799b`) and logo, pulled from
  khdentallab.com. Phone numbers are still `(XXX) XXX-XXXX` placeholders.

## Setup steps

1. **Database** — create a Postgres DB, run `backend/db/schema.sql` against it.
2. **Backend config** — copy `backend/.env.example` to `backend/.env`, fill
   in `DATABASE_URL`, generate a fresh `PICKUP_ACTION_SECRET`
   (e.g. `openssl rand -hex 32`), set `RESEND_API_KEY` (sign up at
   resend.com, verify a khdentallab.com sending domain).
3. **Run/deploy the backend** — `npm install && npm run dev` locally, or
   deploy to Render/wherever, same pattern as `aim-crm-backend`. Confirm
   `GET /health` responds once deployed.
4. **Frontend** — copy the two components + the constants snippet into KH's
   site repo. Merge `lib/constants.snippet.js` into KH's real
   `src/lib/constants.js`, pointing `WEB_LEADS_API` at the backend URL from
   step 3.
5. **Rebrand the UI** — replace every `kh-teal`/`kh-deep` placeholder class
   with KH's actual Tailwind theme tokens, fill in the real phone number in
   `CONTACT`.
6. **Wire it into KH's Contact page** — use
   `pages/ContactPickupSection.example.jsx` as a reference, not a drop-in
   (KH's actual Contact page will have its own layout/copy around it). Keep
   the `id="schedule-pickup"` and the hash-scroll `useEffect` — every
   "Schedule Pickup" link/button across KH's site should point at
   `/contact#schedule-pickup`.
7. **Test end-to-end**: submit a pickup on KH's site → confirm the staff
   notification email arrives with working Dispatch/Received buttons →
   click Dispatch → confirm the requester gets the "on the way" email →
   click Received → confirm the requester gets "case received" and a
   placeholder row appears in the `cases` table.
