import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorizeAgentRequest, callAgentRouter, getAuthorizedCompanies } from '../_shared/runtime.ts';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const AGENT_KEY = 'dipika_agent';
const ROUTER_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-router`;
const ROUTER_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const WATI_URL = Deno.env.get('WHATSAPP_API_URL');
const WATI_TOKEN = Deno.env.get('WHATSAPP_API_TOKEN');
const MD_PHONE = Deno.env.get('MD_PHONE_NUMBER');

async function callAI(prompt: string, system?: string): Promise<{text:string;model:string}> {
  try {
    return await callAgentRouter(prompt, system || '', AGENT_KEY);
  } catch { return {text:'',model:'error'}; }
}

async function sendWhatsApp(phone: string, msg: string) {
  if (!WATI_URL||!WATI_TOKEN||!phone) return;
  try { await fetch(`${WATI_URL}/sendSessionMessage/${phone.replace(/[^0-9]/g,'')}`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${WATI_TOKEN}`},body:JSON.stringify({messageText:msg})}); } catch {}
}

Deno.serve(async (req: Request) => {
  const auth = await authorizeAgentRequest(req);
  if (auth instanceof Response) return auth;
  const startTime = Date.now();
  const body = req.method==='POST' ? await req.json().catch(()=>({})) : {};
  const action = body.action as string|undefined;
  const jobId  = body.job_id as string|undefined;
  const companies = await getAuthorizedCompanies(supabase, auth);
  if (!companies?.length) return new Response(JSON.stringify({message:'No companies'}));
  const today = new Date().toISOString().split('T')[0];
  const results: any[] = [];

  for (const company of companies) {
    await supabase.from('ai_agents').update({last_run_at:new Date().toISOString()}).eq('company_id',company.id).eq('agent_key',AGENT_KEY);
    const {data:pendingEntries} = await supabase.from('customs_entries').select('*').eq('company_id',company.id).in('status',['pending','query_raised','examination']).order('created_at',{ascending:true}).limit(10);
    let aiAlerts=0, tasksCreated=0;
    for (const entry of (pendingEntries||[])) {
      const daysPending = Math.ceil((Date.now()-new Date(entry.created_at).getTime())/86400000);
      const priority = daysPending>=5?'critical':daysPending>=3?'high':'medium';
      if (daysPending>=2) {
        const {data:existing} = await supabase.from('tasks').select('id').eq('company_id',company.id).eq('related_id',entry.id).eq('task_type','customs_action').maybeSingle();
        if (!existing) { await supabase.from('tasks').insert({company_id:company.id,title:`🛃 Customs: ${entry.be_number||entry.id} (${daysPending}d pending)`,description:`BE: ${entry.be_number||'Pending'} | Status: ${entry.status} | ${daysPending} days`,task_type:'customs_action',priority,related_to:'customs_entry',related_id:entry.id,created_by:AGENT_KEY,due_date:today}); tasksCreated++; }
      }
      if (entry.status==='examination') {
        const {text,model} = await callAI(
          `Customs examination case: BE ${entry.be_number||'Pending'}, Status: ${entry.status}, Days pending: ${daysPending}, HS Code: ${entry.hs_code||'Unknown'}. Provide: 1) Likely reason for examination 2) Documents to prepare 3) Risk: LOW/MEDIUM/HIGH 4) Action in 24h`,
          'You are Dipika, Customs Compliance Agent for Veloryn Global Logistics (India/JNPT). Be concise and practical.'
        );
        if (text) { await supabase.from('customs_entries').update({ai_notes:text,ai_checked_at:new Date().toISOString()}).eq('id',entry.id); aiAlerts++; if (priority==='critical'&&MD_PHONE) await sendWhatsApp(MD_PHONE,`🛃 Dipika Alert\nExamination: ${entry.be_number||entry.id}\n${daysPending} days pending\nModel: ${model}`); }
      }
    }
    if (action==='duty_calc'&&jobId) {
      const {data:job} = await supabase.from('jobs').select('*').eq('id',jobId).single();
      if (job) {
        const {text,model} = await callAI(`Calculate Indian customs duty for: Cargo: ${job.cargo_description}, HS Code: ${job.hs_code||'TBD'}, Value: ${job.declared_value||'Not stated'}. Include BCD, SWS, IGST, total in INR at rate 92.87 USD/INR.`,'You are a CBIC customs duty expert for India. Be precise with calculations.');
        results.push({action:'duty_calc',job_number:job.job_number,calculation:text,model});
      }
    }
    const {data:agentMessages} = await supabase.from('agent_messages').select('*').eq('company_id',company.id).eq('to_agent',AGENT_KEY).eq('status','pending').order('created_at',{ascending:true}).limit(10);
    for (const msg of (agentMessages||[])) {
      const payload = msg.payload as Record<string,unknown>;
      if (msg.from_agent==='andrew_agent'&&payload.job_id) {
        const {data:job} = await supabase.from('jobs').select('job_number,cargo_description').eq('id',payload.job_id as string).single();
        if (job) { await supabase.from('tasks').insert({company_id:company.id,title:`📋 File BE: ${job.job_number}`,description:`Arrived ${payload.days_since_arrival} days ago. Cargo: ${job.cargo_description}.`,task_type:'customs_action',priority:(payload.days_since_arrival as number)>=5?'critical':'high',related_to:'job',related_id:payload.job_id as string,created_by:AGENT_KEY,due_date:today}); tasksCreated++; }
      }
      await supabase.from('agent_messages').update({status:'processed',processed_at:new Date().toISOString()}).eq('id',msg.id);
    }
    await supabase.from('agent_messages').insert({company_id:company.id,from_agent:AGENT_KEY,to_agent:'tesla_agent',message_type:'update',priority:aiAlerts>0?'high':'low',subject:`Dipika: ${pendingEntries?.length||0} customs entries, ${tasksCreated} tasks, ${aiAlerts} AI checks`,payload:{pending:pendingEntries?.length||0,tasks:tasksCreated,ai_alerts:aiAlerts,results},status:'pending'});
    await supabase.from('agent_logs').insert({company_id:company.id,agent_id:AGENT_KEY,status:'completed',summary:`Dipika: ${pendingEntries?.length||0} entries, ${tasksCreated} tasks, ${aiAlerts} AI analyses via Router.`,details:{tasks:tasksCreated,ai_alerts:aiAlerts,results},completed_at:new Date().toISOString(),duration_ms:Date.now()-startTime});
  }
  return new Response(JSON.stringify({success:true,agent:'Dipika',results}),{headers:{'Content-Type':'application/json'}});
});
