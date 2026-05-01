-- ============================================================
-- ShipCore - RLS Extensions
-- Apply after rls-policies.sql and ai-rls.sql.
-- ============================================================

CREATE OR REPLACE FUNCTION user_can_write()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT role FROM users WHERE id = auth.uid()), '') <> 'viewer';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT role FROM users WHERE id = auth.uid()), '') = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfs_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customs_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE coloading ENABLE ROW LEVEL SECURITY;
ALTER TABLE coloading_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_settings_select" ON company_settings FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "company_settings_insert_admin" ON company_settings FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_is_admin());

CREATE POLICY "company_settings_update_admin" ON company_settings FOR UPDATE
  USING (company_id = get_user_company_id() AND user_is_admin())
  WITH CHECK (company_id = get_user_company_id() AND user_is_admin());

CREATE POLICY "vendors_select" ON vendors FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "vendors_insert" ON vendors FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "vendors_update" ON vendors FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "vendors_delete" ON vendors FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "vendor_bills_select" ON vendor_bills FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "vendor_bills_insert" ON vendor_bills FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "vendor_bills_update" ON vendor_bills FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "vendor_bills_delete" ON vendor_bills FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "enquiries_select" ON enquiries FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "enquiries_insert" ON enquiries FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "enquiries_update" ON enquiries FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "enquiries_delete" ON enquiries FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "quotes_select" ON quotes FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "quotes_insert" ON quotes FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "quotes_update" ON quotes FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "quotes_delete" ON quotes FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "payments_select" ON payments FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "payments_insert" ON payments FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "payments_update" ON payments FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "payments_delete" ON payments FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "rates_select" ON rates FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "rates_insert" ON rates FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "rates_update" ON rates FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "rates_delete" ON rates FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "tasks_select" ON tasks FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "tasks_insert" ON tasks FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "tasks_update" ON tasks FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "tasks_delete" ON tasks FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "containers_select" ON containers FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "containers_insert" ON containers FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "containers_update" ON containers FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "containers_delete" ON containers FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "cfs_operations_select" ON cfs_operations FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "cfs_operations_insert" ON cfs_operations FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "cfs_operations_update" ON cfs_operations FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "cfs_operations_delete" ON cfs_operations FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "customs_entries_select" ON customs_entries FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "customs_entries_insert" ON customs_entries FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "customs_entries_update" ON customs_entries FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "customs_entries_delete" ON customs_entries FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "coloading_select" ON coloading FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "coloading_insert" ON coloading FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "coloading_update" ON coloading FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "coloading_delete" ON coloading FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "coloading_items_select" ON coloading_items FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "coloading_items_insert" ON coloading_items FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "coloading_items_update" ON coloading_items FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "coloading_items_delete" ON coloading_items FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "notifications_insert" ON notifications FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "notifications_delete" ON notifications FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "feature_proposals_select" ON feature_proposals FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "feature_proposals_insert" ON feature_proposals FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "feature_proposals_update" ON feature_proposals FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "feature_proposals_delete" ON feature_proposals FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "ai_agents_select" ON ai_agents FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "ai_agents_insert" ON ai_agents FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "ai_agents_update" ON ai_agents FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "ai_agents_delete" ON ai_agents FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "agent_messages_select" ON agent_messages FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "agent_messages_insert" ON agent_messages FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "agent_messages_update" ON agent_messages FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "agent_messages_delete" ON agent_messages FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "agent_logs_select" ON agent_logs FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "agent_logs_insert" ON agent_logs FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "agent_logs_update" ON agent_logs FOR UPDATE
  USING (company_id = get_user_company_id() AND user_can_write())
  WITH CHECK (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "agent_logs_delete" ON agent_logs FOR DELETE
  USING (company_id = get_user_company_id() AND user_can_write());

CREATE POLICY "customers_insert_non_viewer" ON customers AS RESTRICTIVE FOR INSERT
  WITH CHECK (user_can_write());

CREATE POLICY "customers_update_non_viewer" ON customers AS RESTRICTIVE FOR UPDATE
  USING (user_can_write())
  WITH CHECK (user_can_write());

CREATE POLICY "customers_delete_non_viewer" ON customers AS RESTRICTIVE FOR DELETE
  USING (user_can_write());

CREATE POLICY "agents_insert_non_viewer" ON agents AS RESTRICTIVE FOR INSERT
  WITH CHECK (user_can_write());

CREATE POLICY "agents_update_non_viewer" ON agents AS RESTRICTIVE FOR UPDATE
  USING (user_can_write())
  WITH CHECK (user_can_write());

CREATE POLICY "agents_delete_non_viewer" ON agents AS RESTRICTIVE FOR DELETE
  USING (user_can_write());

CREATE POLICY "jobs_insert_non_viewer" ON jobs AS RESTRICTIVE FOR INSERT
  WITH CHECK (user_can_write());

CREATE POLICY "jobs_update_non_viewer" ON jobs AS RESTRICTIVE FOR UPDATE
  USING (user_can_write())
  WITH CHECK (user_can_write());

CREATE POLICY "consol_insert_non_viewer" ON consol AS RESTRICTIVE FOR INSERT
  WITH CHECK (user_can_write());

CREATE POLICY "consol_update_non_viewer" ON consol AS RESTRICTIVE FOR UPDATE
  USING (user_can_write())
  WITH CHECK (user_can_write());

CREATE POLICY "consol_delete_non_viewer" ON consol AS RESTRICTIVE FOR DELETE
  USING (user_can_write());

CREATE POLICY "consol_mapping_insert_non_viewer" ON consol_mapping AS RESTRICTIVE FOR INSERT
  WITH CHECK (user_can_write());

CREATE POLICY "consol_mapping_update_non_viewer" ON consol_mapping AS RESTRICTIVE FOR UPDATE
  USING (user_can_write())
  WITH CHECK (user_can_write());

CREATE POLICY "consol_mapping_delete_non_viewer" ON consol_mapping AS RESTRICTIVE FOR DELETE
  USING (user_can_write());

CREATE POLICY "invoices_insert_non_viewer" ON invoices AS RESTRICTIVE FOR INSERT
  WITH CHECK (user_can_write());

CREATE POLICY "invoices_update_non_viewer" ON invoices AS RESTRICTIVE FOR UPDATE
  USING (user_can_write())
  WITH CHECK (user_can_write());

CREATE POLICY "invoices_delete_non_viewer" ON invoices AS RESTRICTIVE FOR DELETE
  USING (user_can_write());
