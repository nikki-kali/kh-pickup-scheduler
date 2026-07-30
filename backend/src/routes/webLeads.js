const express = require('express')
const cors = require('cors')
const db = require('../config/db')
const { sendEmail, pickupRequestedEmail } = require('../services/email')
const rateLimiter = require('../middleware/rateLimiter')
const { pickupActionToken } = require('./pickupAction')

const router = express.Router()
const BACKEND_URL = process.env.BACKEND_URL || 'https://kh-crm-backend.onrender.com'

// This route is called from the marketing website's browser JS, which lives
// on a different origin than KH's CRM/dashboard (if any) — an open CORS
// policy is scoped to just this one public, unauthenticated, rate-limited
// endpoint rather than loosening app-wide CORS. If this router is mounted
// behind a global cors()/express.json() in app.js, mount it BEFORE those so
// this route's own permissive cors() actually runs on preflight requests.
router.use(cors())
router.use(express.json({ limit: '256kb' }))

function webLeadEmail({ name, practice, email, phone, caseType, message, leadId, isPickup }) {
  const rows = [
    ['Name', name],
    ['Practice', practice || '—'],
    ['Email', email],
    ['Phone', phone || '—'],
    caseType && ['Reason', caseType],
    message && ['Message', message],
  ].filter(Boolean)

  const rowsHtml = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-weight:600;white-space:nowrap">${label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${value}</td>
      </tr>`
    )
    .join('')

  // One-click stage-2/3 links — see routes/pickupAction.js for what they hit.
  const actionLinksHtml = isPickup
    ? `
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #f3f4f6">
        <a href="${BACKEND_URL}/api/leads/${leadId}/pickup-action/dispatched?token=${pickupActionToken(leadId, 'dispatched')}"
           style="display:inline-block;background:#31799b;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;margin-right:10px">
          Mark Dispatched
        </a>
        <a href="${BACKEND_URL}/api/leads/${leadId}/pickup-action/received?token=${pickupActionToken(leadId, 'received')}"
           style="display:inline-block;background:#fff;color:#31799b;border:1.5px solid #31799b;padding:9px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
          Mark Received
        </a>
      </div>`
    : ''

  return `
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
      <div style="background:#31799b;padding:20px 32px">
        <span style="color:#fff;font-weight:700;font-size:16px">${isPickup ? 'Case Pickup Request' : 'New website lead'}</span>
      </div>
      <div style="padding:32px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rowsHtml}</table>
        ${actionLinksHtml}
      </div>
      <div style="background:#f9fafb;padding:16px 32px;font-size:12px;color:#9ca3af">
        Kings Highway Dental Laboratory website — khdentallab.com
      </div>
    </div>
    </body></html>
  `
}

// POST /api/web-leads — public endpoint for the marketing website's Contact
// form and Pickup scheduler. No API key (it's called from browser JS, so a
// key here would just be public); relies on a honeypot field + IP rate
// limiting instead.
router.post(
  '/',
  rateLimiter({ windowMs: 10 * 60 * 1000, max: 8 }),
  async (req, res, next) => {
    try {
      const {
        name, practice, email, phone, caseType, message, company,
        pickupAddress, pickupDate, pickupWindow, caseCount, instructions,
      } = req.body

      // Honeypot: real visitors never see or fill this field. Pretend success
      // so bots don't learn their submission was rejected.
      if (company) {
        return res.json({ success: true })
      }

      if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) {
        return res.status(400).json({ error: 'a valid email is required' })
      }

      // The pickup scheduler and a plain Contact form both post here with no
      // distinct formType — the pickup scheduler's fixed caseType
      // 'Schedule Pickup' is the only signal that tells them apart, used
      // both for CC routing below and for the pickup_status/stage-1 email.
      const isPickup = caseType === 'Schedule Pickup'
      const caseInterest = caseType || 'General Inquiry'

      const { rows } = await db.query(
        `INSERT INTO leads
          (doctor_name, clinic_name, phone, email, lead_source,
           case_interest, notes, status, intent_level, created_via, created_at, updated_at, last_contacted_at, pickup_status)
         VALUES ($1,$2,$3,$4,'Website Form Submission',$5,$6,'Lead','Medium','web-leads-api',NOW(),NOW(),NOW(),$7)
         RETURNING id`,
        [
          name.trim(),
          practice || '',
          phone || '',
          email,
          caseInterest,
          message || '',
          isPickup ? 'requested' : null,
        ]
      )

      // Pickup requests route to a different inbox/CC list than a plain
      // Contact submission — configure independently via env vars.
      const recipient = isPickup
        ? process.env.PICKUP_FORM_EMAIL || 'digital@khdentallab.com'
        : process.env.CONTACT_FORM_EMAIL || 'info@khdentallab.com'

      const cc = isPickup
        ? (process.env.PICKUP_FORM_CC || '').split(',').map((s) => s.trim()).filter(Boolean)
        : undefined

      // Email notification is best-effort — a lead that's saved but doesn't
      // trigger an email is recoverable; failing the whole request over a
      // flaky email send would lose the submission entirely.
      try {
        await sendEmail({
          to: recipient,
          cc,
          subject: isPickup
            ? 'New Case Pickup Request - Kings Highway Dental Laboratory'
            : `New website contact — ${name.trim()}`,
          html: webLeadEmail({
            name: name.trim(), practice, email, phone, caseType, message,
            leadId: rows[0].id, isPickup,
          }),
        })
      } catch (emailErr) {
        console.error('web-leads: email notification failed', emailErr)
      }

      // Stage 1 of 3 — confirms receipt to the requester themselves (separate
      // from the internal notification above, and independently best-effort).
      // Stages 2/3 (dispatched/received) fire from services/pickupStatus.js,
      // triggered by the one-click links in the internal email above.
      if (isPickup && email) {
        try {
          await sendEmail({
            to: email,
            subject: 'Kings Highway Dental Laboratory — pickup request received',
            html: pickupRequestedEmail({
              doctorName: name.trim(),
              pickupAddress,
              pickupDate,
              pickupWindow,
              caseCount,
              instructions,
            }),
          })
        } catch (emailErr) {
          console.error('web-leads: requester confirmation email failed', emailErr)
        }
      }

      res.json({ success: true, id: rows[0].id })
    } catch (err) {
      next(err)
    }
  }
)

module.exports = router
