const { Resend } = require('resend')

let resend

function getResend() {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY)
  return resend
}

// Optional fallback if Resend's domain verification is ever stuck pending —
// AIM's backend uses Brevo's HTTPS transactional API here because Render
// blocks outbound SMTP (port 465 times out). Only wire this up if KH hits
// the same problem; requires its own BREVO_API_KEY + a verified KH sender.
async function sendViaBrevo({ to, subject, html, cc }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Kings Highway Dental Laboratory', email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: to || process.env.ALERT_EMAIL }],
      ...(cc?.length ? { cc: cc.map((email) => ({ email })) } : {}),
      subject,
      htmlContent: html,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Brevo send failed (${res.status}): ${body}`)
  }
}

async function sendEmail({ to, subject, html, cc }) {
  const client = getResend()
  const from = process.env.RESEND_FROM || 'Kings Highway Dental Laboratory <onboarding@resend.dev>'
  const { error } = await client.emails.send({
    from,
    to: to || process.env.ALERT_EMAIL,
    ...(cc?.length ? { cc } : {}),
    subject,
    html,
  })
  if (!error) return

  if (!process.env.BREVO_API_KEY) {
    throw new Error(error.message)
  }
  console.warn('sendEmail: Resend failed, falling back to Brevo —', error.message)
  await sendViaBrevo({ to, subject, html, cc })
}

const BACKEND_URL = process.env.BACKEND_URL || 'https://kh-crm-backend.onrender.com'
const LOGO_URL = `${BACKEND_URL}/brand/kh-dental-logo.png`

// Wraps requester-facing pickup status emails in KH branding. #31799b is
// KH's real brand blue (pulled from khdentallab.com). The logo itself is
// solid blue on a transparent background, so the header band underneath it
// has to stay light/white — putting it on a blue band would wash it out to
// near-invisible.
function pickupCustomerWrapper(heading, content) {
  return `
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
      <div style="background:#fff;padding:24px 32px;border-bottom:3px solid #31799b">
        <img src="${LOGO_URL}" height="28" alt="Kings Highway Dental Laboratory" style="display:block;height:28px;width:auto" />
      </div>
      <div style="padding:32px">
        <h1 style="color:#111;font-size:18px;margin:0 0 16px">${heading}</h1>
        ${content}
      </div>
      <div style="background:#f9fafb;padding:16px 32px;font-size:12px;color:#9ca3af">
        Kings Highway Dental Laboratory — khdentallab.com
      </div>
    </div>
    </body></html>
  `
}

// Stage 1 — sent immediately on submission (routes/webLeads.js).
function pickupRequestedEmail({ doctorName, pickupAddress, pickupDate, pickupWindow, caseCount, instructions }) {
  const rows = [
    ['Pickup address', pickupAddress],
    ['Preferred date', pickupDate],
    ['Time window', pickupWindow],
    ['Cases / boxes', caseCount],
    instructions && ['Special instructions', instructions],
  ].filter(Boolean)

  const rowsHtml = rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:6px 12px 6px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${label}</td>
        <td style="padding:6px 0;color:#111">${value}</td>
      </tr>`)
    .join('')

  return pickupCustomerWrapper("We've received your pickup request", `
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px">
      Hi ${doctorName || 'there'}, thanks for scheduling a case pickup with Kings Highway Dental Laboratory.
      We've got your request and our team will have it confirmed shortly — you'll get another
      email once a courier is dispatched to collect your case.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${rowsHtml}</table>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin-top:20px">
      Questions or need to make a change? Call us at <strong>(718) 331-2241</strong>.
    </p>
  `)
}

// Stage 2 — sent when staff click "Mark Dispatched".
function pickupDispatchedEmail(lead) {
  return pickupCustomerWrapper('Your courier is on the way', `
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px">
      Hi ${lead.doctor_name || 'there'}, a courier has been dispatched to collect your case.
      You'll get a final confirmation email once it arrives back at our lab.
    </p>
    <p style="color:#374151;font-size:14px;line-height:1.6">
      Anything come up? Call us at <strong>(718) 331-2241</strong>.
    </p>
  `)
}

// Stage 3 — sent when staff click "Mark Received".
function pickupReceivedEmail(lead) {
  return pickupCustomerWrapper("We've received your case", `
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px">
      Hi ${lead.doctor_name || 'there'}, your case has arrived at Kings Highway Dental Laboratory and is now in
      our production queue. We'll be in touch if we need anything further.
    </p>
    <p style="color:#374151;font-size:14px;line-height:1.6">
      Questions on turnaround? Call us at <strong>(718) 331-2241</strong>.
    </p>
  `)
}

module.exports = {
  sendEmail,
  pickupRequestedEmail,
  pickupDispatchedEmail,
  pickupReceivedEmail,
}
