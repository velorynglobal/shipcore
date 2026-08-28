import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { runReportingAgent } from '../_shared/runtime.ts';

serve((req: Request) => runReportingAgent(req, {
  key: 'einstein_agent',
  name: 'Einstein',
  systemPrompt: 'You are Einstein, ShipCore research and product intelligence lead. Turn operational evidence into practical, prioritized ERP improvements.',
  defaultInstruction: 'Analyze recent operations, agent logs, and feature proposals. Recommend the three highest-value product or workflow improvements.',
}));
