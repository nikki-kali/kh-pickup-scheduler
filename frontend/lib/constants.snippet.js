// Merge these into KH's existing src/lib/constants.js — don't replace the
// whole file, just add/adjust these entries.

// Where every "Schedule Pickup" button/link across the site points.
export const SCHEDULE_PICKUP_URL = '/contact#schedule-pickup'

export const CONTACT = {
  phone: '(718) 331-2241', // urgent calls / talk to someone
  phoneHref: 'tel:+17183312241',
  digitalEmail: 'digital@khdentallab.com', // or whatever inbox KH wants surfaced publicly
  address: 'Kings Highway Dental Laboratory street address',
}

// Points at aim-crm-backend — the shared CRM both AIM Dental Laboratory and
// Kings Highway report into (see PickupScheduler.jsx's brand: 'Kings Highway'
// field). The standalone backend/ in this package is retired and unused in
// production. Override locally via .env.local if needed.
export const WEB_LEADS_API =
  import.meta.env.VITE_WEB_LEADS_API || 'https://aim-crm-backend.onrender.com/api/web-leads'

// Email-verification gate used before a pickup can be submitted — same host
// as WEB_LEADS_API, both with permissive CORS for browser requests.
export const VERIFY_EMAIL_REQUEST_API =
  import.meta.env.VITE_VERIFY_EMAIL_REQUEST_API || 'https://aim-crm-backend.onrender.com/api/verify-email/request'
export const VERIFY_EMAIL_CONFIRM_API =
  import.meta.env.VITE_VERIFY_EMAIL_CONFIRM_API || 'https://aim-crm-backend.onrender.com/api/verify-email/confirm'

export const EASE_CONFIDENT = [0.16, 1, 0.3, 1]
