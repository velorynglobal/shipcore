-- ============================================================
-- ShipCore - Operational Schema Extensions
-- Covers app tables that were previously only implied by routes.
-- Apply after schema.sql and ai-schema.sql.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS enquiry_seq START 1;
CREATE SEQUENCE IF NOT EXISTS payment_seq START 1;
CREATE SEQUENCE IF NOT EXISTS quote_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS coload_number_seq START 1;

CREATE OR REPLACE FUNCTION public.nextval(seq text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  next_value bigint;
BEGIN
  IF seq NOT IN (
    'enquiry_seq',
    'payment_seq',
    'quote_number_seq',
    'coload_number_seq',
    'job_number_seq',
    'consol_number_seq',
    'invoice_number_seq',
    'hbl_number_seq'
  ) THEN
    RAISE EXCEPTION 'Sequence % is not allowed', seq;
  END IF;

  EXECUTE format('SELECT pg_catalog.nextval(%L::regclass)', seq) INTO next_value;
  RETURN next_value;
END;
$$;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS buy_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sell_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enquiry_id UUID,
  ADD COLUMN IF NOT EXISTS quote_id UUID;

CREATE TABLE IF NOT EXISTS company_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  legal_name          TEXT,
  trade_name          TEXT,
  city                TEXT,
  address_line1       TEXT,
  state               TEXT,
  pincode             TEXT,
  md_whatsapp         TEXT,
  accounts_email      TEXT,
  ops_email           TEXT,
  gstin               TEXT,
  gst_state           TEXT,
  pan                 TEXT,
  iec_code            TEXT,
  cha_license         TEXT,
  tds_applicable      BOOLEAN NOT NULL DEFAULT FALSE,
  advance_tax_applicable BOOLEAN NOT NULL DEFAULT FALSE,
  bank_name           TEXT,
  bank_branch         TEXT,
  bank_account        TEXT,
  bank_ifsc           TEXT,
  whatsapp_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  email_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_prefix      TEXT DEFAULT 'INV',
  quote_prefix        TEXT DEFAULT 'QT',
  job_prefix          TEXT DEFAULT 'SC',
  next_invoice_number INTEGER NOT NULL DEFAULT 1,
  updated_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  vendor_type     TEXT NOT NULL DEFAULT 'other',
  contact_person  TEXT,
  mobile          TEXT,
  email           TEXT,
  city            TEXT,
  country         TEXT DEFAULT 'India',
  pan_number      TEXT,
  gstin           TEXT,
  credit_days     INTEGER NOT NULL DEFAULT 0,
  credit_limit    NUMERIC(12,2) NOT NULL DEFAULT 0,
  bank_name       TEXT,
  bank_account    TEXT,
  bank_ifsc       TEXT,
  rating          NUMERIC(3,1),
  preferred       BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  bill_number     TEXT,
  bill_date       DATE,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date        DATE,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'paid', 'overdue', 'cancelled')),
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enquiries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  enquiry_number       TEXT NOT NULL,
  customer_id          UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name        TEXT,
  origin               TEXT NOT NULL,
  destination          TEXT NOT NULL,
  cargo_type           TEXT NOT NULL DEFAULT 'LCL',
  cbm                  NUMERIC(10,3),
  weight               NUMERIC(10,3),
  packages             INTEGER,
  commodity            TEXT,
  incoterm             TEXT,
  target_rate          NUMERIC(12,2),
  currency             TEXT DEFAULT 'USD',
  special_requirements TEXT,
  source               TEXT DEFAULT 'email',
  follow_up_date       DATE,
  validity_days        INTEGER NOT NULL DEFAULT 7,
  assigned_to          UUID REFERENCES users(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'new'
                         CHECK (status IN ('new', 'quoted', 'follow_up', 'won', 'lost', 'expired', 'cancelled')),
  remarks              TEXT,
  created_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, enquiry_number)
);

CREATE TABLE IF NOT EXISTS quotes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  quote_number   TEXT NOT NULL,
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  enquiry_id     UUID REFERENCES enquiries(id) ON DELETE SET NULL,
  job_id         UUID REFERENCES jobs(id) ON DELETE SET NULL,
  origin         TEXT NOT NULL,
  destination    TEXT NOT NULL,
  cargo_type     TEXT NOT NULL DEFAULT 'LCL',
  cbm            NUMERIC(10,3),
  weight         NUMERIC(10,3),
  validity_date  DATE NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'USD',
  notes          TEXT,
  buy_rate       NUMERIC(12,2) NOT NULL DEFAULT 0,
  sell_rate      NUMERIC(12,2) NOT NULL DEFAULT 0,
  margin         NUMERIC(12,2) NOT NULL DEFAULT 0,
  margin_pct     NUMERIC(8,2) NOT NULL DEFAULT 0,
  line_items     JSONB NOT NULL DEFAULT '[]'::jsonb,
  status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
  sent_at        TIMESTAMPTZ,
  accepted_at    TIMESTAMPTZ,
  rejected_at    TIMESTAMPTZ,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, quote_number)
);

CREATE TABLE IF NOT EXISTS payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  payment_number    TEXT NOT NULL,
  invoice_id        UUID REFERENCES invoices(id) ON DELETE SET NULL,
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  amount            NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'INR',
  payment_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode      TEXT NOT NULL DEFAULT 'bank_transfer',
  reference_number  TEXT,
  bank_name         TEXT,
  tds_deducted      BOOLEAN NOT NULL DEFAULT FALSE,
  tds_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes             TEXT,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, payment_number)
);

CREATE TABLE IF NOT EXISTS rates (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_id              UUID REFERENCES vendors(id) ON DELETE SET NULL,
  rate_type              TEXT NOT NULL DEFAULT 'sea',
  origin_port            TEXT NOT NULL,
  destination_port       TEXT NOT NULL,
  carrier_name           TEXT,
  service_name           TEXT,
  cargo_type             TEXT NOT NULL DEFAULT 'general',
  currency               TEXT NOT NULL DEFAULT 'USD',
  buy_rate               NUMERIC(12,2),
  sell_rate              NUMERIC(12,2),
  margin                 NUMERIC(12,2),
  transit_days           INTEGER,
  free_days_origin       INTEGER NOT NULL DEFAULT 0,
  free_days_destination  INTEGER NOT NULL DEFAULT 14,
  valid_from             DATE,
  valid_to               DATE,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  notes                  TEXT,
  created_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  task_type     TEXT NOT NULL DEFAULT 'manual',
  priority      TEXT NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status        TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date      TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS containers (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                 UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id                     UUID REFERENCES jobs(id) ON DELETE SET NULL,
  container_number           TEXT,
  container_type             TEXT,
  seal_number                TEXT,
  stuffing_type              TEXT,
  stuffing_date              DATE,
  stuffed_weight             NUMERIC(10,3),
  vgm_weight                 NUMERIC(10,3),
  vgm_method                 TEXT,
  gate_in_date               DATE,
  gate_out_date              DATE,
  on_board_date              DATE,
  discharge_date             DATE,
  pickup_date                DATE,
  return_date                DATE,
  last_free_day_destination  DATE,
  free_days                  INTEGER NOT NULL DEFAULT 14,
  detention_rate_per_day     NUMERIC(12,2) NOT NULL DEFAULT 0,
  detention_days             INTEGER NOT NULL DEFAULT 0,
  detention_amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  risk_level                 TEXT NOT NULL DEFAULT 'low'
                               CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  is_returned                BOOLEAN NOT NULL DEFAULT FALSE,
  status                     TEXT NOT NULL DEFAULT 'active',
  notes                      TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cfs_operations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id                UUID REFERENCES jobs(id) ON DELETE SET NULL,
  container_number      TEXT,
  seal_number           TEXT,
  cfs_number            TEXT,
  cfs_location          TEXT,
  operation_type        TEXT NOT NULL DEFAULT 'import',
  vessel_name           TEXT,
  voyage_number         TEXT,
  mbl_number            TEXT,
  hbl_number            TEXT,
  line_name             TEXT,
  inward_date           DATE,
  inward_time           TIME,
  gross_weight_inward   NUMERIC(10,3),
  packages_inward       INTEGER,
  condition_on_arrival  TEXT,
  damage_remarks        TEXT,
  destuff_type          TEXT,
  destuff_date          DATE,
  gross_weight_actual   NUMERIC(10,3),
  packages_actual       INTEGER,
  cbm_actual            NUMERIC(10,3),
  destuff_remarks       TEXT,
  destuff_done_by       TEXT,
  storage_start_date    DATE,
  storage_end_date      DATE,
  storage_charges       NUMERIC(12,2) NOT NULL DEFAULT 0,
  do_number             TEXT,
  do_date               DATE,
  do_expiry             DATE,
  out_date              DATE,
  delivered_to          TEXT,
  transporter_name      TEXT,
  vehicle_number        TEXT,
  driver_name           TEXT,
  driver_mobile         TEXT,
  delivery_challan      TEXT,
  empty_return_date     DATE,
  empty_return_location TEXT,
  empty_returned_to     TEXT,
  empty_receipt_number  TEXT,
  status                TEXT NOT NULL DEFAULT 'inward_pending',
  handling_charges      NUMERIC(12,2) NOT NULL DEFAULT 0,
  examination_charges   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cfs_charges     NUMERIC(12,2) NOT NULL DEFAULT 0,
  documents             JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes                 TEXT,
  created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customs_entries (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                 UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id                     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  be_number                  TEXT,
  entry_number               TEXT,
  be_date                    DATE,
  be_type                    TEXT,
  importer_name              TEXT,
  iec_code                   TEXT,
  gstin                      TEXT,
  port_of_entry              TEXT,
  hs_code                    TEXT,
  cif_value                  NUMERIC(14,2),
  assessable_value           NUMERIC(14,2),
  exchange_rate              NUMERIC(12,4),
  declared_value             NUMERIC(14,2),
  currency                   TEXT DEFAULT 'USD',
  basic_duty_rate            NUMERIC(6,2),
  basic_duty                 NUMERIC(14,2),
  igst_rate                  NUMERIC(6,2),
  igst_amount                NUMERIC(14,2),
  social_welfare_surcharge   NUMERIC(14,2),
  total_duty                 NUMERIC(14,2),
  duty_paid_amount           NUMERIC(14,2),
  status                     TEXT NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'filed', 'under_assessment', 'examination', 'query_raised', 'duty_paid', 'out_of_charge', 'completed')),
  filing_date                DATE,
  assessment_date            DATE,
  duty_paid_date             DATE,
  out_of_charge_date         DATE,
  release_date               DATE,
  examination_type           TEXT,
  examination_date           DATE,
  examination_officer        TEXT,
  examination_notes          TEXT,
  ai_notes                   TEXT,
  ai_checked_at              TIMESTAMPTZ,
  document_checklist         JSONB NOT NULL DEFAULT '{}'::jsonb,
  remarks                    TEXT,
  created_by                 UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coloading (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  coload_number     TEXT NOT NULL,
  coload_type       TEXT NOT NULL DEFAULT 'lcl',
  direction         TEXT NOT NULL DEFAULT 'import' CHECK (direction IN ('import', 'export')),
  pol               TEXT,
  pod               TEXT,
  vessel_name       TEXT,
  voyage_number     TEXT,
  mbl_number        TEXT,
  carrier_name      TEXT,
  etd               DATE,
  eta               DATE,
  total_cbm         NUMERIC(10,3) NOT NULL DEFAULT 0,
  total_weight      NUMERIC(10,3) NOT NULL DEFAULT 0,
  total_packages    INTEGER NOT NULL DEFAULT 0,
  freight_rate      NUMERIC(12,2),
  freight_currency  TEXT NOT NULL DEFAULT 'USD',
  total_freight     NUMERIC(12,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'open',
  notes             TEXT,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, coload_number)
);

CREATE TABLE IF NOT EXISTS coloading_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  coload_id               UUID NOT NULL REFERENCES coloading(id) ON DELETE CASCADE,
  job_id                  UUID REFERENCES jobs(id) ON DELETE SET NULL,
  customer_id             UUID REFERENCES customers(id) ON DELETE SET NULL,
  cargo_description       TEXT,
  cbm                     NUMERIC(10,3) NOT NULL DEFAULT 0,
  weight                  NUMERIC(10,3) NOT NULL DEFAULT 0,
  packages                INTEGER NOT NULL DEFAULT 0,
  hbl_number              TEXT,
  hbl_date                DATE,
  marks_numbers           TEXT,
  freight_share           NUMERIC(8,2) NOT NULL DEFAULT 0,
  freight_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  handling_charges        NUMERIC(12,2) NOT NULL DEFAULT 0,
  documentation_charges   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_charges           NUMERIC(12,2) NOT NULL DEFAULT 0,
  status                  TEXT DEFAULT 'active',
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('whatsapp', 'email')),
  recipient      TEXT NOT NULL,
  subject        TEXT,
  message        TEXT NOT NULL,
  job_id         UUID REFERENCES jobs(id) ON DELETE SET NULL,
  invoice_id     UUID REFERENCES invoices(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'sent', 'failed')),
  error_message  TEXT,
  sent_at        TIMESTAMPTZ,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_proposals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  proposal_number   TEXT NOT NULL,
  feature_name      TEXT NOT NULL,
  category          TEXT,
  impact_score      INTEGER,
  priority_score    NUMERIC(10,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'proposed',
  business_problem  TEXT,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, proposal_number)
);

CREATE TABLE IF NOT EXISTS ai_agents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_key     TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  agent_domain  TEXT NOT NULL,
  agent_class   TEXT NOT NULL DEFAULT 'system',
  status        TEXT NOT NULL DEFAULT 'idle',
  last_run_at   TIMESTAMPTZ,
  run_count     INTEGER NOT NULL DEFAULT 0,
  error_count   INTEGER NOT NULL DEFAULT 0,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  can_approve   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, agent_key)
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_agent    TEXT NOT NULL,
  to_agent      TEXT NOT NULL,
  subject       TEXT,
  message_type  TEXT NOT NULL DEFAULT 'message',
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority      TEXT NOT NULL DEFAULT 'normal',
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_id      TEXT NOT NULL,
  status        TEXT NOT NULL,
  summary       TEXT,
  duration_ms   INTEGER NOT NULL DEFAULT 0,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'jobs_enquiry_id_fkey'
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_enquiry_id_fkey
      FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'jobs_quote_id_fkey'
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_quote_id_fkey
      FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION sync_container_detention()
RETURNS TRIGGER AS $$
DECLARE
  overdue_days integer := 0;
  days_until_lfd integer;
  reference_date date;
BEGIN
  IF NEW.last_free_day_destination IS NOT NULL THEN
    reference_date := CASE
      WHEN COALESCE(NEW.is_returned, FALSE) AND NEW.return_date IS NOT NULL THEN NEW.return_date
      ELSE CURRENT_DATE
    END;

    overdue_days := GREATEST(reference_date - NEW.last_free_day_destination, 0);
    NEW.detention_days := overdue_days;
    NEW.detention_amount := overdue_days * COALESCE(NEW.detention_rate_per_day, 0);
    days_until_lfd := NEW.last_free_day_destination - CURRENT_DATE;

    IF COALESCE(NEW.is_returned, FALSE) THEN
      NEW.risk_level := 'low';
    ELSIF overdue_days > 0 OR days_until_lfd <= 0 THEN
      NEW.risk_level := 'critical';
    ELSIF days_until_lfd <= 2 THEN
      NEW.risk_level := 'high';
    ELSIF days_until_lfd <= 5 THEN
      NEW.risk_level := 'medium';
    ELSE
      NEW.risk_level := 'low';
    END IF;
  ELSE
    NEW.detention_days := 0;
    NEW.detention_amount := 0;
    NEW.risk_level := COALESCE(NEW.risk_level, 'low');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recalc_coload_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_coload_id UUID;
BEGIN
  v_coload_id := COALESCE(NEW.coload_id, OLD.coload_id);

  UPDATE coloading
  SET
    total_cbm = (
      SELECT COALESCE(SUM(cbm), 0)
      FROM coloading_items
      WHERE coload_id = v_coload_id
    ),
    total_weight = (
      SELECT COALESCE(SUM(weight), 0)
      FROM coloading_items
      WHERE coload_id = v_coload_id
    ),
    total_packages = (
      SELECT COALESCE(SUM(packages), 0)
      FROM coloading_items
      WHERE coload_id = v_coload_id
    ),
    updated_at = NOW()
  WHERE id = v_coload_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_company_settings_updated_at') THEN
    CREATE TRIGGER trg_company_settings_updated_at
      BEFORE UPDATE ON company_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_vendors_updated_at') THEN
    CREATE TRIGGER trg_vendors_updated_at
      BEFORE UPDATE ON vendors
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_vendor_bills_updated_at') THEN
    CREATE TRIGGER trg_vendor_bills_updated_at
      BEFORE UPDATE ON vendor_bills
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enquiries_updated_at') THEN
    CREATE TRIGGER trg_enquiries_updated_at
      BEFORE UPDATE ON enquiries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_quotes_updated_at') THEN
    CREATE TRIGGER trg_quotes_updated_at
      BEFORE UPDATE ON quotes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payments_updated_at') THEN
    CREATE TRIGGER trg_payments_updated_at
      BEFORE UPDATE ON payments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rates_updated_at') THEN
    CREATE TRIGGER trg_rates_updated_at
      BEFORE UPDATE ON rates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tasks_updated_at') THEN
    CREATE TRIGGER trg_tasks_updated_at
      BEFORE UPDATE ON tasks
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_containers_updated_at') THEN
    CREATE TRIGGER trg_containers_updated_at
      BEFORE UPDATE ON containers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cfs_operations_updated_at') THEN
    CREATE TRIGGER trg_cfs_operations_updated_at
      BEFORE UPDATE ON cfs_operations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_customs_entries_updated_at') THEN
    CREATE TRIGGER trg_customs_entries_updated_at
      BEFORE UPDATE ON customs_entries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_coloading_updated_at') THEN
    CREATE TRIGGER trg_coloading_updated_at
      BEFORE UPDATE ON coloading
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_coloading_items_updated_at') THEN
    CREATE TRIGGER trg_coloading_items_updated_at
      BEFORE UPDATE ON coloading_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notifications_updated_at') THEN
    CREATE TRIGGER trg_notifications_updated_at
      BEFORE UPDATE ON notifications
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_feature_proposals_updated_at') THEN
    CREATE TRIGGER trg_feature_proposals_updated_at
      BEFORE UPDATE ON feature_proposals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_ai_agents_updated_at') THEN
    CREATE TRIGGER trg_ai_agents_updated_at
      BEFORE UPDATE ON ai_agents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_agent_messages_updated_at') THEN
    CREATE TRIGGER trg_agent_messages_updated_at
      BEFORE UPDATE ON agent_messages
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_containers_detention') THEN
    CREATE TRIGGER trg_containers_detention
      BEFORE INSERT OR UPDATE ON containers
      FOR EACH ROW EXECUTE FUNCTION sync_container_detention();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_coloading_item_totals') THEN
    CREATE TRIGGER trg_coloading_item_totals
      AFTER INSERT OR UPDATE OR DELETE ON coloading_items
      FOR EACH ROW EXECUTE FUNCTION recalc_coload_totals();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_company_settings_company_id   ON company_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_vendors_company_id            ON vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_company_id       ON vendor_bills(company_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_vendor_id        ON vendor_bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_company_id          ON enquiries(company_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_status              ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_quotes_company_id             ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status                 ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_enquiry_id             ON quotes(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_payments_company_id           ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id           ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_rates_company_id              ON rates(company_id);
CREATE INDEX IF NOT EXISTS idx_rates_vendor_id               ON rates(vendor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id              ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority         ON tasks(company_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_containers_company_id         ON containers(company_id);
CREATE INDEX IF NOT EXISTS idx_containers_job_id             ON containers(job_id);
CREATE INDEX IF NOT EXISTS idx_cfs_operations_company_id     ON cfs_operations(company_id);
CREATE INDEX IF NOT EXISTS idx_cfs_operations_job_id         ON cfs_operations(job_id);
CREATE INDEX IF NOT EXISTS idx_customs_entries_company_id    ON customs_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_customs_entries_job_id        ON customs_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_coloading_company_id          ON coloading(company_id);
CREATE INDEX IF NOT EXISTS idx_coloading_items_coload_id     ON coloading_items(coload_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id      ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_job_id          ON notifications(job_id);
CREATE INDEX IF NOT EXISTS idx_feature_proposals_company_id  ON feature_proposals(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_company_id          ON ai_agents(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_company_id     ON agent_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_company_id         ON agent_logs(company_id);

SELECT setval(
  'job_number_seq',
  GREATEST(
    COALESCE((SELECT MAX((substring(job_number FROM '([0-9]{4})$'))::integer) FROM jobs), 0),
    1
  ),
  true
);

SELECT setval(
  'hbl_number_seq',
  GREATEST(
    COALESCE((SELECT MAX((substring(hbl_number FROM '([0-9]{4})$'))::integer) FROM jobs), 0),
    1
  ),
  true
);

SELECT setval(
  'invoice_number_seq',
  GREATEST(
    COALESCE((SELECT MAX((substring(invoice_number FROM '([0-9]{4})$'))::integer) FROM invoices), 0),
    1
  ),
  true
);

SELECT setval(
  'consol_number_seq',
  GREATEST(
    COALESCE((SELECT MAX((substring(consol_number FROM '([0-9]{4})$'))::integer) FROM consol), 0),
    1
  ),
  true
);

SELECT setval(
  'enquiry_seq',
  GREATEST(
    COALESCE((SELECT MAX((substring(enquiry_number FROM '([0-9]{4})$'))::integer) FROM enquiries), 0),
    1
  ),
  true
);

SELECT setval(
  'payment_seq',
  GREATEST(
    COALESCE((SELECT MAX((substring(payment_number FROM '([0-9]{4})$'))::integer) FROM payments), 0),
    1
  ),
  true
);

SELECT setval(
  'quote_number_seq',
  GREATEST(
    COALESCE((SELECT MAX((substring(quote_number FROM '([0-9]{4})$'))::integer) FROM quotes), 0),
    1
  ),
  true
);

SELECT setval(
  'coload_number_seq',
  GREATEST(
    COALESCE((SELECT MAX((substring(coload_number FROM '([0-9]{4})$'))::integer) FROM coloading), 0),
    1
  ),
  true
);
