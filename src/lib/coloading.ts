/* eslint-disable @typescript-eslint/no-explicit-any */

export function sanitizeColoadRecord(payload: Record<string, any>) {
  const { id, company_id, created_at, created_by, updated_at, items, ...rest } = payload;
  void id;
  void company_id;
  void created_at;
  void created_by;
  void updated_at;
  void items;
  return rest;
}

export function sanitizeColoadItem(payload: Record<string, any>) {
  const { id, company_id, coload_id, created_at, updated_at, job, customer, ...rest } = payload;
  void id;
  void company_id;
  void coload_id;
  void created_at;
  void updated_at;
  void job;
  void customer;
  return rest;
}

export function buildColoadItemRows(items: any[], companyId: string, coloadId: string) {
  return (items || []).map((item) => ({
    ...sanitizeColoadItem(item),
    company_id: companyId,
    coload_id: coloadId,
  }));
}

export async function hydrateColoadItems(supabase: any, items: any[]) {
  const rows = items ?? [];
  if (rows.length === 0) return [];

  const jobIds = [...new Set(rows.map((item) => item.job_id).filter(Boolean))];
  const customerIds = [...new Set(rows.map((item) => item.customer_id).filter(Boolean))];

  const [jobsResult, customersResult] = await Promise.all([
    jobIds.length > 0
      ? supabase.from('jobs').select('id, job_number').in('id', jobIds)
      : Promise.resolve({ data: [] }),
    customerIds.length > 0
      ? supabase.from('customers').select('id, company_name').in('id', customerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const jobMap = new Map<string, any>((jobsResult.data ?? []).map((job: any) => [job.id, job]));
  const customerMap = new Map<string, any>(
    (customersResult.data ?? []).map((customer: any) => [customer.id, customer])
  );

  return rows.map((item) => ({
    ...item,
    job: item.job_id ? jobMap.get(item.job_id) ?? null : null,
    customer: item.customer_id ? customerMap.get(item.customer_id) ?? null : null,
  }));
}
