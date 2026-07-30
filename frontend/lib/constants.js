// Local dev version of lib/constants.snippet.js, wired up so the components
// actually run in this scratch frontend. When copying this package into
// KH's real site repo, merge constants.snippet.js into KH's own
// src/lib/constants.js instead of using this file.

export const SCHEDULE_PICKUP_URL = '/contact#schedule-pickup'

export const CONTACT = {
  phone: '(718) 331-2241',
  phoneHref: 'tel:+17183312241',
  digitalEmail: 'digital@khdentallab.com',
  address: 'Kings Highway Dental Laboratory street address',
}

// Points at the local backend from ../backend by default; override with
// VITE_WEB_LEADS_API in a .env.local if the backend runs elsewhere.
export const WEB_LEADS_API =
  import.meta.env.VITE_WEB_LEADS_API || 'http://localhost:4210/api/web-leads'

export const EASE_CONFIDENT = [0.16, 1, 0.3, 1]
