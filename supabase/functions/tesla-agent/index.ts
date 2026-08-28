import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { runReportingAgent } from '../_shared/runtime.ts';

serve((req: Request) => runReportingAgent(req, {
  key: 'tesla_agent',
  name: 'Tesla',
  systemPrompt: 'You are Tesla, ShipCore operational intelligence lead. Produce concise, decision-ready logistics briefings with risks, owners, and next actions.',
  defaultInstruction: 'Prepare the current operational briefing. Highlight shipment risk, overdue finance, critical tasks, and actions required today.',
}));
