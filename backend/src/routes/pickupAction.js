const express = require('express')
const crypto = require('crypto')
const { advancePickupStage } = require('../services/pickupStatus')

const router = express.Router()

// Signed token stands in for auth on the one-click links below — an email
// link can't carry a header or a login session. Exported so webLeads.js can
// build matching links into the internal staff notification email.
function pickupActionToken(id, stage) {
  return crypto
    .createHmac('sha256', process.env.PICKUP_ACTION_SECRET || '')
    .update(`${id}:${stage}`)
    .digest('hex')
    .slice(0, 32)
}

function simplePage(title, message) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .card{background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);padding:40px;max-width:420px;text-align:center}
  h1{color:#111;font-size:18px;margin:0 0 8px}
  p{color:#6b7280;font-size:14px;margin:0}
</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`
}

// GET /api/leads/:id/pickup-action/:stage — one-click links embedded in the
// internal staff notification email (see routes/webLeads.js).
// Idempotent: re-clicking, or clicking an earlier-stage link after a later
// one already fired, just shows a confirmation page without re-notifying
// the requester — see advancePickupStage() in services/pickupStatus.js.
router.get('/:id/pickup-action/:stage', async (req, res) => {
  const { id, stage } = req.params
  if (!['dispatched', 'received'].includes(stage)) {
    return res.status(400).send(simplePage('Invalid link', 'This action is not recognized.'))
  }

  const expected = pickupActionToken(id, stage)
  const provided = req.query.token || ''
  const valid = expected.length === provided.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
  if (!valid) {
    return res.status(403).send(simplePage('Link expired or invalid', 'This link is no longer valid.'))
  }

  try {
    const result = await advancePickupStage(id, stage)
    if (result.notFound) {
      return res.status(404).send(simplePage('Not found', 'This pickup request could not be found.'))
    }
    if (result.alreadyDone) {
      return res.send(simplePage('Already marked', `This pickup was already marked as ${stage} (or further along) — no changes made.`))
    }
    res.send(simplePage(
      stage === 'dispatched' ? 'Marked as dispatched' : 'Marked as received',
      `${result.lead.doctor_name} has been notified by email. You can close this tab.`
    ))
  } catch (err) {
    console.error('pickup-action failed', err)
    res.status(500).send(simplePage('Something went wrong', 'Please try again, or update this in the CRM directly.'))
  }
})

module.exports = router
module.exports.pickupActionToken = pickupActionToken
