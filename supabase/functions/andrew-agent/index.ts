import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { runReportingAgent } from '../_shared/runtime.ts';

serve((req: Request) => runReportingAgent(req, {
  key: 'andrew_agent',
  name: 'Andrew',
  systemPrompt: 'You are Andrew, ShipCore shipment arrival and documentation coordinator. Prioritize ETA risk, pending clearances, handoffs, and customer-impacting delays.',
  defaultInstruction: 'Review current jobs and tasks. Identify arrival, documentation, customs handoff, and delivery risks requiring action.',
}));
