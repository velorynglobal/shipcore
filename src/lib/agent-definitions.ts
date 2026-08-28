export interface AgentDefinition {
  agent_key: string;
  display_name: string;
  agent_domain: string;
  agent_class: 'ai' | 'human';
  permissions: string[];
  can_approve: boolean;
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    agent_key: 'ajit_agent', display_name: 'Ajit', agent_domain: 'management', agent_class: 'human', can_approve: true,
    permissions: ['dashboard:read', 'approvals:write', 'commands:approve', 'workflow:read', 'system:admin'],
  },
  {
    agent_key: 'alex_agent', display_name: 'Alex', agent_domain: 'sales', agent_class: 'ai', can_approve: false,
    permissions: ['quotes:read', 'quotes:write', 'enquiries:read', 'enquiries:write', 'rates:read', 'rates:write', 'whatsapp:read', 'customers:read', 'customers:write', 'followup:manage', 'crm:manage', 'notifications:send'],
  },
  {
    agent_key: 'andrew_agent', display_name: 'Andrew', agent_domain: 'operations', agent_class: 'ai', can_approve: false,
    permissions: ['jobs:read', 'jobs:write', 'consol:read', 'consol:write', 'containers:read', 'containers:write'],
  },
  {
    agent_key: 'aslesha_agent', display_name: 'Aslesha', agent_domain: 'executive', agent_class: 'ai', can_approve: true,
    permissions: ['dashboard:read', 'approvals:write', 'alerts:read', 'proposals:approve', 'reports:read'],
  },
  {
    agent_key: 'dipika_agent', display_name: 'Dipika', agent_domain: 'compliance', agent_class: 'ai', can_approve: false,
    permissions: ['customs:read', 'customs:write', 'audit:read', 'audit:write', 'documents:read'],
  },
  {
    agent_key: 'einstein_agent', display_name: 'Einstein', agent_domain: 'innovation', agent_class: 'ai', can_approve: false,
    permissions: ['proposals:write', 'system_observations:write', 'workflow:read', 'feature_proposals:write', 'usage:analyze', 'trends:research', 'gaps:identify', 'improvements:suggest'],
  },
  {
    agent_key: 'ganesh_agent', display_name: 'Ganesh', agent_domain: 'operations', agent_class: 'ai', can_approve: false,
    permissions: ['cfs:read', 'cfs:write', 'vendors:read', 'jobs:read', 'jobs:write', 'containers:read', 'containers:write', 'detention:monitor', 'detention:alert', 'shipment:track', 'eta:monitor'],
  },
  {
    agent_key: 'german_agent', display_name: 'German', agent_domain: 'documentation', agent_class: 'ai', can_approve: false,
    permissions: ['documents:read', 'documents:write', 'hbl:generate', 'invoice:generate', 'customs:read'],
  },
  {
    agent_key: 'komal_agent', display_name: 'Komal', agent_domain: 'customer_service', agent_class: 'ai', can_approve: false,
    permissions: ['customers:read', 'notifications:send', 'tickets:write', 'enquiries:read', 'emails:read', 'emails:classify', 'inbox:process', 'whatsapp:read', 'whatsapp:respond'],
  },
  {
    agent_key: 'pranali_agent', display_name: 'Pranali', agent_domain: 'finance', agent_class: 'ai', can_approve: false,
    permissions: ['invoices:read', 'invoices:write', 'payments:read', 'payments:write', 'vendor_bills:read', 'vendor_bills:write', 'collections:manage', 'aging:report', 'payment:reminders', 'credit:control', 'accounts:payable', 'accounts:receivable', 'gst:monitor', 'gst:file', 'gst:reconcile', 'tds:monitor', 'tds:deduct', 'tds:file', 'advance_tax:monitor', 'advance_tax:remind', 'tax:compliance', 'tax:audit', 'tax:report'],
  },
  {
    agent_key: 'steve_agent', display_name: 'Steve', agent_domain: 'platform', agent_class: 'ai', can_approve: false,
    permissions: ['system:read', 'workflow:write', 'tests:write', 'proposals:read', 'agent_commands:write', 'bugs:fix', 'features:implement', 'schema:design', 'api:design', 'deployments:manage'],
  },
  {
    agent_key: 'tesla_agent', display_name: 'Tesla', agent_domain: 'control', agent_class: 'ai', can_approve: false,
    permissions: ['commands:dispatch', 'workflow:manage', 'messages:route', 'alerts:read', 'alerts:create', 'broadcasts:send', 'system:monitor', 'notifications:send', 'whatsapp:send'],
  },
];

export const AGENT_SLUGS = Object.fromEntries(
  AGENT_DEFINITIONS.map((agent) => [agent.agent_key, agent.agent_key.replace('_agent', '-agent')]),
) as Record<string, string>;

export function agentRowsForCompany(companyId: string) {
  return AGENT_DEFINITIONS.map((agent) => ({
    ...agent,
    company_id: companyId,
    agent_type: agent.agent_key.replace('_agent', ''),
    status: 'active',
    metadata: {},
  }));
}
