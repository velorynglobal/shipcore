const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

process.loadEnvFile('.env.local');

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const email = `shipcore.smoke.${Date.now()}@example.com`;
const password = `Sc-${crypto.randomBytes(18).toString('base64url')}!`;
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

let userId;
let companyId;

function cookieHeader(response) {
  const values = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  return values.map((value) => value.split(';', 1)[0]).join('; ');
}

async function expectStatus(label, response, expected) {
  const body = await response.text();
  if (response.status !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${response.status}: ${body.slice(0, 500)}`);
  }
  console.log(`${label}: ${response.status}`);
  return body ? JSON.parse(body) : null;
}

async function main() {
  const protectedPage = await fetch(`${baseUrl}/dashboard`, { redirect: 'manual' });
  if (![302, 307, 308].includes(protectedPage.status) || !protectedPage.headers.get('location')?.includes('/login')) {
    throw new Error(`middleware redirect failed: ${protectedPage.status} ${protectedPage.headers.get('location')}`);
  }
  console.log(`anonymous middleware: ${protectedPage.status}`);

  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      full_name: 'ShipCore Smoke Test',
      company_name: `ShipCore Smoke ${Date.now()}`,
    }),
  });
  const registrationData = await expectStatus('registration', registration, 201);
  userId = registrationData.data.user.id;
  companyId = registrationData.data.company.id;

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  await expectStatus('login', login.clone(), 200);
  const cookies = cookieHeader(login);
  if (!cookies.includes('sb-')) throw new Error('login did not return a Supabase session cookie');

  const dashboard = await fetch(`${baseUrl}/dashboard`, { headers: { Cookie: cookies }, redirect: 'manual' });
  if (dashboard.status !== 200) throw new Error(`authenticated dashboard failed: ${dashboard.status}`);
  console.log(`authenticated dashboard: ${dashboard.status}`);

  const agentDashboard = await fetch(`${baseUrl}/api/agent-dashboard`, { headers: { Cookie: cookies } });
  const agentDashboardData = await expectStatus('authenticated agent API', agentDashboard, 200);
  if (agentDashboardData.total !== 12) {
    throw new Error(`agent provisioning failed: expected 12 agents, received ${agentDashboardData.total}`);
  }
  console.log('agent provisioning: 12');

  const rejectedAgent = await fetch(`${baseUrl}/api/agent-trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify({ agent_key: 'unknown_agent', url: 'http://127.0.0.1/admin' }),
  });
  await expectStatus('agent allowlist', rejectedAgent, 400);
}

main()
  .then(() => console.log('Auth smoke test passed.'))
  .finally(async () => {
    if (companyId) await admin.from('companies').delete().eq('id', companyId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
