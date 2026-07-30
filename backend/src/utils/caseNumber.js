const db = require('../config/db')

// Single-brand version for KH's standalone backend — AIM's original picks a
// prefix per-brand ('AIM' vs 'KH') since it runs multiple brands through one
// CRM; KH's own backend only ever needs its own prefix.
async function generateCaseNumber() {
  const prefix = 'KH'
  const year = new Date().getFullYear()
  const { rows } = await db.query('SELECT COUNT(*) FROM cases')
  const count = parseInt(rows[0].count, 10)
  return `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`
}

module.exports = { generateCaseNumber }
