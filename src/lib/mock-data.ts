// Mock data for development when Supabase is not configured

// Agent Dashboard Mock
export const mockAgentDashboard = {
  agents: [
    {
      agent_key: 'route-optimizer',
      display_name: 'Route Optimizer',
      agent_domain: 'logistics',
      agent_class: 'planning',
      status: 'active',
      last_run_at: new Date(Date.now() - 3600000).toISOString(),
      run_count: 142,
      error_count: 3,
      permissions: ['read', 'write'],
      can_approve: true,
    },
    {
      agent_key: 'compliance-checker',
      display_name: 'Compliance Checker',
      agent_domain: 'customs',
      agent_class: 'validation',
      status: 'active',
      last_run_at: new Date(Date.now() - 7200000).toISOString(),
      run_count: 89,
      error_count: 1,
      permissions: ['read'],
      can_approve: false,
    },
    {
      agent_key: 'rate-negotiator',
      display_name: 'Rate Negotiator',
      agent_domain: 'finance',
      agent_class: 'negotiation',
      status: 'active',
      last_run_at: new Date(Date.now() - 1800000).toISOString(),
      run_count: 67,
      error_count: 0,
      permissions: ['read', 'write'],
      can_approve: true,
    },
  ],
  total: 3,
  error: null,
};

// Agent Logs Mock
export const mockAgentLogs = Array.from({ length: 15 }, (_, i) => ({
  id: `log-${i}`,
  agent_key: ['route-optimizer', 'compliance-checker', 'rate-negotiator'][i % 3],
  timestamp: new Date(Date.now() - i * 300000).toISOString(),
  status: i % 5 === 0 ? 'error' : 'success',
  message: i % 5 === 0 ? 'Rate fetch timeout' : 'Task completed successfully',
  duration_ms: Math.floor(Math.random() * 5000) + 200,
}));

// Feature Proposals Mock
export const mockFeatureProposals = [
  {
    id: 'fp-1',
    title: 'Multi-currency invoicing',
    description: 'Allow invoices in multiple currencies with auto conversion',
    status: 'proposed',
    votes: 12,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'fp-2',
    title: 'WhatsApp notifications',
    description: 'Send shipment updates via WhatsApp',
    status: 'in_progress',
    votes: 28,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'fp-3',
    title: 'Real-time vessel tracking',
    description: 'Track vessel positions on map',
    status: 'completed',
    votes: 45,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

// Agent Messages Mock
export const mockAgentMessages = Array.from({ length: 10 }, (_, i) => ({
  id: `msg-${i}`,
  agent_key: ['route-optimizer', 'compliance-checker'][i % 2],
  content: i % 2 === 0
    ? 'Optimized route saves 12% transit time'
    : 'All compliance checks passed',
  timestamp: new Date(Date.now() - i * 600000).toISOString(),
  type: i % 2 === 0 ? 'insight' : 'status',
}));

// Reports Mock
export const mockReports = {
  pnl: {
    revenue: 2450000,
    costs: 1890000,
    profit: 560000,
    margin: 22.86,
    period: 'this_year',
  },
  aging: [
    { bucket: '0-30', count: 45, amount: 125000 },
    { bucket: '31-60', count: 23, amount: 89000 },
    { bucket: '61-90', count: 12, amount: 34000 },
    { bucket: '90+', count: 8, amount: 67000 },
  ],
  dashboard: {
    totalShipments: 342,
    activeJobs: 89,
    pendingCustoms: 12,
    revenue: 2450000,
    customers: 67,
    agents: 3,
  },
};

// Marketplace Mock
export const mockMarketplace = {
  agents: [
    {
      id: 'weather-agent',
      name: 'Weather Intelligence',
      description: 'Get real-time weather data for route planning',
      version: '1.2.0',
      author: 'Veloryn Labs',
      rating: 4.8,
      installs: 234,
      tags: ['weather', 'logistics'],
      installed: true,
    },
    {
      id: 'compliance-agent',
      name: 'Compliance Guardian',
      description: 'Automated compliance checking for customs',
      version: '2.0.1',
      author: 'Veloryn Labs',
      rating: 4.9,
      installs: 567,
      tags: ['compliance', 'customs'],
      installed: true,
    },
    {
      id: 'analytics-agent',
      name: 'Analytics Pro',
      description: 'Advanced analytics and reporting',
      version: '1.5.0',
      author: 'Veloryn Labs',
      rating: 4.7,
      installs: 189,
      tags: ['analytics', 'reporting'],
      installed: true,
    },
  ],
};

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
