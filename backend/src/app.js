const path = require('path')
const express = require('express')
const cors = require('cors')
const errorHandler = require('./middleware/errorHandler')

const webLeadRoutes = require('./routes/webLeads')
const pickupActionRoutes = require('./routes/pickupAction')

const app = express()

// Serves the brand logo at BACKEND_URL/brand/kh-dental-logo.png — email
// clients need a public image URL, so the logo used in email templates is
// hosted here rather than hotlinked from khdentallab.com's WordPress media
// library (which won't survive KH ever migrating off WordPress).
app.use('/brand', express.static(path.join(__dirname, '../public/brand')))

// Mounted BEFORE the global cors()/express.json() below — webLeads.js has
// its own permissive cors() + express.json() scoped to just that public
// endpoint. If this were mounted after the global cors(), Express would
// already have answered/short-circuited on that path and this route's own
// cors() would never run.
app.use('/api/web-leads', webLeadRoutes) // public — marketing website Contact/Pickup forms
app.use('/api/leads', pickupActionRoutes) // public (token-secured) — one-click dispatch/received links

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (req, res) => res.json({ ok: true }))

app.use(errorHandler)

module.exports = app
