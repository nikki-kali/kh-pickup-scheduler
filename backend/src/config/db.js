const { Pool } = require('pg')

// Local Postgres (e.g. a docker container for dev) has no SSL listener at
// all, whereas hosted Postgres (Render, etc.) requires it — so only enable
// SSL when the connection isn't to localhost.
const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
})

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err)
})

module.exports = pool
