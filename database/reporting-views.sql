-- ============================================================
-- ShipCore - Reporting Views
-- Apply after schema.sql, ai-schema.sql, and schema-extensions.sql.
-- ============================================================

CREATE OR REPLACE VIEW vw_job_pnl AS
WITH invoice_totals AS (
  SELECT
    job_id,
    SUM(CASE WHEN status <> 'cancelled' THEN total_amount ELSE 0 END) AS invoiced_amount
  FROM invoices
  GROUP BY job_id
),
payment_totals AS (
  SELECT
    i.job_id,
    SUM(p.amount) AS collected_amount
  FROM payments p
  JOIN invoices i ON i.id = p.invoice_id
  GROUP BY i.job_id
)
SELECT
  j.company_id,
  j.id AS job_id,
  j.job_number,
  j.customer_id,
  c.company_name AS customer_name,
  j.status,
  j.created_at,
  COALESCE(j.buy_total, 0) AS buy_total,
  COALESCE(j.sell_total, 0) AS sell_total,
  COALESCE(j.profit, COALESCE(j.sell_total, 0) - COALESCE(j.buy_total, 0)) AS profit,
  CASE
    WHEN COALESCE(j.buy_total, 0) > 0
      THEN ROUND(((COALESCE(j.sell_total, 0) - COALESCE(j.buy_total, 0)) / j.buy_total) * 100, 2)
    ELSE 0
  END AS margin_pct,
  COALESCE(it.invoiced_amount, 0) AS invoiced_amount,
  COALESCE(pt.collected_amount, 0) AS collected_amount
FROM jobs j
LEFT JOIN customers c ON c.id = j.customer_id
LEFT JOIN invoice_totals it ON it.job_id = j.id
LEFT JOIN payment_totals pt ON pt.job_id = j.id;

CREATE OR REPLACE VIEW vw_aging AS
WITH payment_totals AS (
  SELECT
    invoice_id,
    SUM(amount) AS paid_amount
  FROM payments
  GROUP BY invoice_id
)
SELECT
  i.company_id,
  i.id AS invoice_id,
  i.invoice_number,
  i.customer_id,
  c.company_name AS customer_name,
  i.status,
  i.created_at,
  i.due_date,
  COALESCE(i.total_amount, 0) AS total_amount,
  COALESCE(pt.paid_amount, 0) AS paid_amount,
  GREATEST(COALESCE(i.total_amount, 0) - COALESCE(pt.paid_amount, 0), 0) AS balance_due,
  CASE
    WHEN i.due_date IS NULL THEN 0
    ELSE GREATEST(CURRENT_DATE - i.due_date, 0)
  END AS days_overdue,
  CASE
    WHEN i.due_date IS NULL OR CURRENT_DATE <= i.due_date THEN 'current'
    WHEN CURRENT_DATE - i.due_date <= 30 THEN '1-30'
    WHEN CURRENT_DATE - i.due_date <= 60 THEN '31-60'
    WHEN CURRENT_DATE - i.due_date <= 90 THEN '61-90'
    ELSE '90+'
  END AS aging_bucket
FROM invoices i
LEFT JOIN customers c ON c.id = i.customer_id
LEFT JOIN payment_totals pt ON pt.invoice_id = i.id
WHERE i.status <> 'cancelled';

CREATE OR REPLACE VIEW vw_gst_summary AS
SELECT
  company_id,
  DATE_TRUNC('month', created_at)::date AS month,
  COUNT(*) AS invoice_count,
  SUM(COALESCE(taxable_amount, 0)) AS taxable_amount,
  SUM(COALESCE(gst_amount, 0)) AS gst_amount,
  SUM(COALESCE(total_amount, 0)) AS total_amount
FROM invoices
WHERE status <> 'cancelled'
GROUP BY company_id, DATE_TRUNC('month', created_at)
ORDER BY month DESC;
