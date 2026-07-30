-- Minimal schema needed for the pickup scheduler backend to run standalone.
-- Trimmed down from AIM's full CRM `leads`/`cases`/`activities` tables to
-- just the columns this feature touches.

CREATE TABLE IF NOT EXISTS leads (
  id                   SERIAL PRIMARY KEY,
  doctor_name          TEXT NOT NULL,
  clinic_name          TEXT DEFAULT '',
  phone                TEXT DEFAULT '',
  email                TEXT,
  lead_source          TEXT,
  case_interest        TEXT,
  notes                TEXT DEFAULT '',
  status               TEXT DEFAULT 'Lead',
  intent_level         TEXT DEFAULT 'Medium',
  created_via          TEXT,
  pickup_status        TEXT,             -- 'requested' | 'dispatched' | 'received' | NULL (non-pickup leads)
  pickup_dispatched_at TIMESTAMPTZ,
  pickup_received_at   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_contacted_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cases (
  id               SERIAL PRIMARY KEY,
  case_number      TEXT NOT NULL,
  client_name      TEXT NOT NULL,
  case_type        TEXT DEFAULT 'Other',
  due_date         DATE,
  doctor_email     TEXT DEFAULT '',
  doctor_phone     TEXT DEFAULT '',
  status           TEXT DEFAULT 'Case Received',
  notes            TEXT DEFAULT '',
  original_lead_id INTEGER REFERENCES leads(id),
  stage_history    JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional — only needed if you want an activity log; pickupStatus.js
-- swallows the insert error if this table doesn't exist, so it's safe to
-- skip entirely.
CREATE TABLE IF NOT EXISTS activities (
  id          SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id   INTEGER NOT NULL,
  type        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
