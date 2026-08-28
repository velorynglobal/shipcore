import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorizeAgentRequest, callAgentRouter, getAuthorizedCompanies } from '../_shared/runtime.ts';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const AGENT_KEY = 'ajit_agent';
const ROUTER_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-router`;
const ROUTER_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const WATI_URL = Deno.env.get('WHATSAPP_API_URL');
const WATI_TOKEN = Deno.env.get('WHATSAPP_API_TOKEN');
const MD_PHONE = Deno.env.get('MD_PHONE_NUMBER');

const AGENT_URLS: Record<string,string> = {
  tesla_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/tesla-agent',
  einstein_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/einstein-agent',
  steve_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/steve-agent',
  ganesh_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/ganesh-agent',
  pranali_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/pranali-agent',
  alex_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/alex-agent',
  komal_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/komal-agent',
  aslesha_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/aslesha-agent',
  german_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/german-agent',
  andrew_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/andrew-agent',
  dipika_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/dipika-agent',
};

async function callAI(prompt:string,system?:string):Promise<{text:string;model:string}>{try{return await callAgentRouter(prompt,system||'',AGENT_KEY);}catch{return{text:'',model:'error'};}}
async function sendWhatsApp(phone:string,msg:string){if(!WATI_URL||!WATI_TOKEN||!phone)return;try{await fetch(`${WATI_URL}/sendSessionMessage/${phone.replace(/[^0-9]/g,'')}`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${WATI_TOKEN}`},body:JSON.stringify({messageText:msg})});}catch{}}

Deno.serve(async (req: Request) => {
  const auth = await authorizeAgentRequest(req);
  if (auth instanceof Response) return auth;
  const startTime = Date.now();
  const body = req.method==='POST' ? await req.json().catch(()=>({})) : {};
  const directInstruction = body.instruction as string | undefined;
  const directTarget = body.target_agent as string | undefined;

  const companies=await getAuthorizedCompanies(supabase,auth);
  if(!companies?.length)return new Response(JSON.stringify({message:'No companies'}));

  let routed = false;

  for(const company of companies){
    await supabase.from('ai_agents').update({last_run_at:new Date().toISOString()}).eq('company_id',company.id).eq('agent_key',AGENT_KEY);

    // Mode 1: Direct instruction routing (called from /api/agent-instruct with target already known)
    if (directInstruction && directTarget) {
      const targetUrl = AGENT_URLS[directTarget];
      if (targetUrl) {
        try {
          await fetch(targetUrl, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instruction: directInstruction, from: AGENT_KEY }),
          });
          routed = true;
        } catch { /* target may still process in background */ }
      }
    }

    // Mode 2: Check for pending responses FROM other agents addressed to Ajit
    const{data:responses} = await supabase.from('agent_messages').select('*').eq('company_id',company.id).eq('to_agent',AGENT_KEY).eq('message_type','response').eq('status','pending').order('created_at',{ascending:true}).limit(10);
    for (const r of (responses||[])) {
      await supabase.from('agent_messages').update({status:'processed',processed_at:new Date().toISOString()}).eq('id',r.id);
    }

    // Mode 3: Check pending approvals (agent_commands requiring sign-off)
    const{data:pendingApprovals} = await supabase.from('agent_commands').select('id,command_type,requested_by').eq('company_id',company.id).eq('requires_approval',true).eq('status','queued').limit(10);
    const criticalTasks = await supabase.from('tasks').select('id',{count:'exact',head:true}).eq('company_id',company.id).eq('priority','critical').eq('status','pending');

    const summary = `Ajit: ${pendingApprovals?.length||0} approvals pending, ${criticalTasks.count||0} critical tasks. Instruction routed: ${routed?'Yes':'No'}.`;

    await supabase.from('agent_logs').insert({
      company_id:company.id, agent_id:AGENT_KEY, status:'completed',
      summary, details:{approvals:pendingApprovals?.length||0, critical_tasks:criticalTasks.count||0, routed, responses_processed:responses?.length||0},
      completed_at:new Date().toISOString(), duration_ms:Date.now()-startTime,
    });
  }

  return new Response(JSON.stringify({success:true,agent:'Ajit',routed}),{headers:{'Content-Type':'application/json'}});
});
