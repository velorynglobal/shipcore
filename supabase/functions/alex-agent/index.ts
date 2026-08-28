import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { runReportingAgent } from '../_shared/runtime.ts';

serve((req: Request) => runReportingAgent(req, {
  key: 'alex_agent',
  name: 'Alex',
  systemPrompt: 'You are Alex, ShipCore reliability and agent-network monitor. Diagnose failures, recurring errors, and operational bottlenecks with concrete remediation.',
  defaultInstruction: 'Review recent agent activity and operational data. Report reliability issues, repeated failures, and the next maintenance actions.',
}));
