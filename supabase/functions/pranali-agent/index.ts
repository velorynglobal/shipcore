import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { runReportingAgent } from '../_shared/runtime.ts';

serve((req: Request) => runReportingAgent(req, {
  key: 'pranali_agent',
  name: 'Pranali',
  systemPrompt: 'You are Pranali, ShipCore finance and Indian tax compliance lead. Be numerically precise and flag aging, GST, cash-flow, and control risks.',
  defaultInstruction: 'Prepare the current finance and compliance briefing, emphasizing overdue invoices, cash-flow exposure, and tax actions.',
}));
