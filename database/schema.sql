-- ============================================================
-- ShipCore ERP - Complete Database Schema
-- Multi-tenant SaaS Architecture with Row Level Security
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: companies
-- ============================================================
CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  address       TEXT,
  city          TEXT,
  country       TEXT DEFAULT 'India',
  phone         TEXT,
  email         TEXT,
  gst_number    TEXT,
  logo_url      TEXT,
  plan          TEXT DEFAULT 'starter' CHECK (plan IN ('starter','growth','enterprise')),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin','operator','viewer')),
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: customers
-- ============================================================
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_name    TEXT NOT NULL,
  contact_person  TEXT,
  mobile          TEXT,
  email           TEXT,
  address         TEXT,
  city            TEXT,
  gst_number      TEXT,
  credit_limit    NUMERIC(12,2) DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: agents
-- ============================================================
CREATE TABLE agents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  port          TEXT NOT NULL,
  country       TEXT NOT NULL,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: jobs
-- ============================================================
CREATE TABLE jobs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_number        TEXT NOT NULL UNIQUE,
  job_type          TEXT DEFAULT 'IMP' CHECK (job_type IN ('IMP','EXP')),
  status            TEXT DEFAULT 'draft' CHECK (status IN ('draft','booked','in-transit','arrived','customs-clearance','delivered','closed','cancelled')),
  
  -- Parties
  customer_id       UUID REFERENCES customers(id),
  consignee_name    TEXT,
  agent_id          UUID REFERENCES agents(id),
  
  -- Routing
  pol               TEXT NOT NULL,        -- Port of Loading
  pod               TEXT NOT NULL,        -- Port of Discharge
  
  -- Cargo
  cargo_description TEXT NOT NULL,
  commodity         TEXT,
  packages          INTEGER DEFAULT 0,
  package_type      TEXT DEFAULT 'CTN',
  gross_weight      NUMERIC(10,3) DEFAULT 0,
  cbm               NUMERIC(10,3) DEFAULT 0,
  
  -- Shipment References
  mbl_number        TEXT,                 -- Master Bill of Lading
  hbl_number        TEXT,                 -- House Bill of Lading (auto-generated)
  carrier           TEXT,
  vessel            TEXT,
  voyage            TEXT,
  container_no      TEXT,
  seal_no           TEXT,
  
  -- Dates
  etd               DATE,                 -- Estimated Time of Departure
  eta               DATE,                 -- Estimated Time of Arrival
  atd               DATE,                 -- Actual Time of Departure
  ata               DATE,                 -- Actual Time of Arrival
  
  -- Customs (for CHA)
  be_number         TEXT,                 -- Bill of Entry
  be_date           DATE,
  assessed_value    NUMERIC(14,2),
  
  -- Internal
  remarks           TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: consol (LCL Consolidation Containers)
-- ============================================================
CREATE TABLE consol (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  consol_number   TEXT NOT NULL UNIQUE,
  container_no    TEXT,
  container_type  TEXT DEFAULT '20GP' CHECK (container_type IN ('20GP','40GP','40HC','45HC')),
  container_size  NUMERIC(5,1) DEFAULT 68.0,   -- Max CBM capacity
  
  pol             TEXT NOT NULL,
  pod             TEXT NOT NULL,
  
  carrier         TEXT,
  vessel          TEXT,
  voyage          TEXT,
  mbl_number      TEXT,
  
  etd             DATE,
  eta             DATE,
  
  status          TEXT DEFAULT 'open' CHECK (status IN ('open','loading','departed','arrived','closed')),
  
  -- Calculated totals (updated via trigger)
  total_cbm       NUMERIC(10,3) DEFAULT 0,
  total_weight    NUMERIC(10,3) DEFAULT 0,
  total_jobs      INTEGER DEFAULT 0,
  
  remarks         TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: consol_mapping (Jobs assigned to Consols)
-- ============================================================
CREATE TABLE consol_mapping (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  consol_id   UUID NOT NULL REFERENCES consol(id) ON DELETE CASCADE,
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  cbm         NUMERIC(10,3) NOT NULL DEFAULT 0,
  weight      NUMERIC(10,3) DEFAULT 0,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE(consol_id, job_id)
);

-- ============================================================
-- TABLE: invoices
-- ============================================================
CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_number    TEXT NOT NULL UNIQUE,
  invoice_type      TEXT DEFAULT 'sales' CHECK (invoice_type IN ('sales','purchase','credit_note')),
  
  job_id            UUID REFERENCES jobs(id),
  customer_id       UUID REFERENCES customers(id),
  
  -- Amounts
  customer_amount   NUMERIC(12,2) DEFAULT 0,    -- Amount billed to customer
  cost_amount       NUMERIC(12,2) DEFAULT 0,    -- Our cost
  profit            NUMERIC(12,2) GENERATED ALWAYS AS (customer_amount - cost_amount) STORED,
  
  -- Tax
  taxable_amount    NUMERIC(12,2) DEFAULT 0,
  gst_rate          NUMERIC(5,2) DEFAULT 18.0,
  gst_amount        NUMERIC(12,2) DEFAULT 0,
  total_amount      NUMERIC(12,2) DEFAULT 0,
  
  -- Status
  status            TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  due_date          DATE,
  paid_date         DATE,
  payment_ref       TEXT,
  
  -- Line items (JSONB for flexibility)
  line_items        JSONB DEFAULT '[]',
  
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEQUENCES for auto-generated numbers
-- ============================================================
CREATE SEQUENCE job_number_seq START 1;
CREATE SEQUENCE consol_number_seq START 1;
CREATE SEQUENCE invoice_number_seq START 1;
CREATE SEQUENCE hbl_number_seq START 1;

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_consol_updated_at BEFORE UPDATE ON consol FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Recalculate consol totals when mapping changes
CREATE OR REPLACE FUNCTION recalc_consol_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_consol_id UUID;
BEGIN
  v_consol_id := COALESCE(NEW.consol_id, OLD.consol_id);
  
  UPDATE consol SET
    total_cbm    = (SELECT COALESCE(SUM(cbm), 0)    FROM consol_mapping WHERE consol_id = v_consol_id),
    total_weight = (SELECT COALESCE(SUM(weight), 0) FROM consol_mapping WHERE consol_id = v_consol_id),
    total_jobs   = (SELECT COUNT(*)                  FROM consol_mapping WHERE consol_id = v_consol_id),
    updated_at   = NOW()
  WHERE id = v_consol_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consol_mapping_totals
AFTER INSERT OR UPDATE OR DELETE ON consol_mapping
FOR EACH ROW EXECUTE FUNCTION recalc_consol_totals();

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_users_company       ON users(company_id);
CREATE INDEX idx_customers_company   ON customers(company_id);
CREATE INDEX idx_agents_company      ON agents(company_id);
CREATE INDEX idx_jobs_company        ON jobs(company_id);
CREATE INDEX idx_jobs_customer       ON jobs(customer_id);
CREATE INDEX idx_jobs_status         ON jobs(status);
CREATE INDEX idx_jobs_created        ON jobs(created_at DESC);
CREATE INDEX idx_consol_company      ON consol(company_id);
CREATE INDEX idx_consol_status       ON consol(status);
CREATE INDEX idx_consol_mapping_consol ON consol_mapping(consol_id);
CREATE INDEX idx_consol_mapping_job    ON consol_mapping(job_id);
CREATE INDEX idx_invoices_company    ON invoices(company_id);
CREATE INDEX idx_invoices_job        ON invoices(job_id);
CREATE INDEX idx_invoices_customer   ON invoices(customer_id);
