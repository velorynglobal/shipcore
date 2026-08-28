import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorizeAgentRequest, callAgentRouter, getAuthorizedCompanies } from '../_shared/runtime.ts';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const AGENT_KEY = 'komal_agent';
const ROUTER_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-router`;
const ROUTER_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

async function callAI(prompt: string, system?: string): Promise<{text:string;model:string}> {
  try {
    return await callAgentRouter(prompt, system || '', AGENT_KEY);
  } catch { return {text:'',model:'error'}; }
}

Deno.serve(async (req: Request) => {
  const auth = await authorizeAgentRequest(req);
  if (auth instanceof Response) return auth;
  const startTime = Date.now();
  const companies = await getAuthorizedCompanies(supabase, auth);
  if (!companies?.length) return new Response(JSON.stringify({message:'No companies'}));
  const today = new Date().toISOString().split('T')[0];

  for (const company of companies) {
    await supabase.from('ai_agents').update({last_run_at:new Date().toISOString()}).eq('company_id',company.id).eq('agent_key',AGENT_KEY);
    const {data:emails} = await supabase.from('email_inbox').select('*').eq('company_id',company.id).eq('is_processed',false).order('received_at',{ascending:true}).limit(20);
    let processed = 0;
    for (const email of (emails||[])) {
      let classification='general',confidence=0.5,summary=email.subject||'',action='manual_review',model='fallback';
      const prompt = `Classify this freight forwarding email. Return JSON only, no markdown:\n{"classification":"booking_request|rate_sheet|payment_received|shipment_update|do_released|enquiry|detention_notice|customs_query|general|unknown","confidence":0.0-1.0,"summary":"one line max","action":"create_job|update_job|store_rates|record_payment|create_task|manual_review"}\n\nSubject: ${email.subject}\nFrom: ${email.from_address}\nBody: ${(email.body_text||'').slice(0,500)}`;
      const {text,model:m} = await callAI(prompt,'You are Komal, customer service agent for Veloryn Global Logistics. Classify freight emails precisely. Return JSON only.');
      model = m;
      if (text) { try { const p=JSON.parse(text.replace(/```json|```/g,'').trim()); classification=p.classification||classification; confidence=p.confidence||confidence; summary=p.summary||summary; action=p.action||action; } catch {} }
      await supabase.from('email_inbox').update({classification,ai_confidence:confidence,ai_summary:summary,ai_action:action,is_processed:true,processed_at:new Date().toISOString(),action_taken:action,action_by:AGENT_KEY}).eq('id',email.id);
      if (confidence>0.7 && ['booking_request','do_released','detention_notice'].includes(classification)) {
        await supabase.from('tasks').insert({company_id:company.id,title:`📧 ${classification.replace(/_/g,' ')}: ${email.from_name||email.from_address}`,description:`Email: ${email.subject}\nSummary: ${summary}`,task_type:classification==='detention_notice'?'detention_alert':classification==='do_released'?'do_followup':'follow_up',priority:classification==='detention_notice'?'critical':'high',created_by:AGENT_KEY,due_date:today});
      }
      if (classification==='rate_sheet'&&confidence>0.7) await supabase.from('agent_messages').insert({company_id:company.id,from_agent:AGENT_KEY,to_agent:'alex_agent',message_type:'task',priority:'medium',subject:`Rate sheet: ${email.from_name||email.from_address}`,payload:{email_id:email.id,from:email.from_address,subject:email.subject,model},status:'pending'});
      if (classification==='detention_notice'&&confidence>0.7) await supabase.from('agent_messages').insert({company_id:company.id,from_agent:AGENT_KEY,to_agent:'ganesh_agent',message_type:'alert',priority:'critical',subject:`Detention notice: ${email.from_name||email.from_address}`,payload:{email_id:email.id,summary,model},status:'pending'});
      processed++;
    }
    await supabase.from('agent_messages').insert({company_id:company.id,from_agent:AGENT_KEY,to_agent:'tesla_agent',message_type:'update',priority:'low',subject:`Komal: Processed ${processed} emails via AI Router`,payload:{processed,date:today},status:'pending'});
    await supabase.from('agent_logs').insert({company_id:company.id,agent_id:AGENT_KEY,status:'completed',summary:`Komal: ${processed} emails processed via AI Router.`,details:{processed},completed_at:new Date().toISOString(),duration_ms:Date.now()-startTime});
  }
  return new Response(JSON.stringify({success:true,agent:'Komal'}),{headers:{'Content-Type':'application/json'}});
});
