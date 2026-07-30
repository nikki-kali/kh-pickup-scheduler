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

// Points at KH's own backend (see ../backend in this package) — NOT AIM's.
// Override locally via .env.local (VITE_WEB_LEADS_API=http://localhost:4000/api/web-leads)
// when running KH's backend dev server against this site.
export const WEB_LEADS_API =
  import.meta.env.VITE_WEB_LEADS_API || 'https://kh-crm-backend.onrender.com/api/web-leads'

export const EASE_CONFIDENT = [0.16, 1, 0.3, 1]
