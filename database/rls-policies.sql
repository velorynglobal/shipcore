-- ============================================================
-- ShipCore - Row Level Security (RLS) Policies
-- Ensures strict per-company data isolation
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE consol          ENABLE ROW LEVEL SECURITY;
ALTER TABLE consol_mapping  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices        ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- companies: users can only see their own company
-- ============================================================
CREATE POLICY "companies_select" ON companies FOR SELECT
  USING (id = get_user_company_id());

CREATE POLICY "companies_update_admin" ON companies FOR UPDATE
  USING (id = get_user_company_id() AND get_user_role() = 'admin');

-- ============================================================
-- users: can see all users in same company
-- ============================================================
CREATE POLICY "users_select" ON users FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "users_insert_admin" ON users FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND get_user_role() = 'admin');

CREATE POLICY "users_update" ON users FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ============================================================
-- customers
-- ============================================================
CREATE POLICY "customers_all" ON customers FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ============================================================
-- agents
-- ============================================================
CREATE POLICY "agents_all" ON agents FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ============================================================
-- jobs
-- ============================================================
CREATE POLICY "jobs_select" ON jobs FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "jobs_insert" ON jobs FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "jobs_update" ON jobs FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "jobs_delete_admin" ON jobs FOR DELETE
  USING (company_id = get_user_company_id() AND get_user_role() = 'admin');

-- ============================================================
-- consol
-- ============================================================
CREATE POLICY "consol_all" ON consol FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ============================================================
-- consol_mapping
-- ============================================================
CREATE POLICY "consol_mapping_all" ON consol_mapping FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ============================================================
-- invoices
-- ============================================================
CREATE POLICY "invoices_all" ON invoices FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ============================================================
-- Service role bypass (for server-side admin operations)
-- ============================================================
-- The service role key bypasses RLS automatically in Supabase
