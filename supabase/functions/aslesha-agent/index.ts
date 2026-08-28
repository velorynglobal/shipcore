import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorizeAgentRequest, callAgentRouter, getAuthorizedCompanies } from '../_shared/runtime.ts';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const AGENT_KEY = 'aslesha_agent';
const ROUTER_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-router`;
const ROUTER_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const WATI_URL = Deno.env.get('WHATSAPP_API_URL');
const WATI_TOKEN = Deno.env.get('WHATSAPP_API_TOKEN');
const MD_PHONE = Deno.env.get('MD_PHONE_NUMBER');

async function callAI(prompt:string,system?:string):Promise<{text:string;model:string}>{try{return await callAgentRouter(prompt,system||'',AGENT_KEY);}catch{return{text:'',model:'error'};}}
async function sendWhatsApp(phone:string,msg:string){if(!WATI_URL||!WATI_TOKEN||!phone)return;try{await fetch(`${WATI_URL}/sendSessionMessage/${phone.replace(/[^0-9]/g,'')}`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${WATI_TOKEN}`},body:JSON.stringify({messageText:msg})});}catch{}}

async function getAgentIds(companyId:string):Promise<{selfId:string|null;ajitId:string|null}>{
  const{data}=await supabase.from('ai_agents').select('id,agent_key').eq('company_id',companyId).in('agent_key',[AGENT_KEY,'ajit_agent']);
  const self=data?.find((a:any)=>a.agent_key===AGENT_KEY);
  const ajit=data?.find((a:any)=>a.agent_key==='ajit_agent');
  return{selfId:self?.id??null,ajitId:ajit?.id??null};
}

async function processInstruction(companyId: string, instruction: string, messageId: string, selfId:string|null, ajitId:string|null): Promise<void> {
  const {text,model} = await callAI(
    `You are Aslesha, CEO Agent for Veloryn Global Logistics. You received this instruction from Ajit (MD):\n"${instruction}"\nRespond with what you will do and any strategic insight. Be concise and direct.`,
    'You are Aslesha, CEO agent for a logistics ERP. Be direct and strategic.'
  );
  await supabase.from('agent_messages').update({status:'processed',processed_at:new Date().toISOString()}).eq('id',messageId);
  if(selfId&&ajitId){
    const{error}=await supabase.from('agent_messages').insert({company_id:companyId,from_agent:AGENT_KEY,to_agent:'ajit_agent',from_agent_id:selfId,to_agent_id:ajitId,message_type:'response',priority:'medium',subject:`Aslesha: ${text.slice(0,80)}`,payload:{instruction,response:text,model},status:'pending'});
    if(error)console.error('Reply insert failed:',error.message);
  }
}

Deno.serve(async (req: Request) => {
  const auth = await authorizeAgentRequest(req);
  if (auth instanceof Response) return auth;
  const startTime=Date.now();
  const body = req.method==='POST' ? await req.json().catch(()=>({})) : {};
  const companies=await getAuthorizedCompanies(supabase,auth);
  if(!companies?.length)return new Response(JSON.stringify({message:'No companies'}));

  for(const company of companies){
    await supabase.from('ai_agents').update({last_run_at:new Date().toISOString()}).eq('company_id',company.id).eq('agent_key',AGENT_KEY);
    const{selfId,ajitId}=await getAgentIds(company.id);

    const{data:pendingMsgs}=await supabase.from('agent_messages').select('*').eq('company_id',company.id).eq('to_agent',AGENT_KEY).eq('status','pending').eq('message_type','task').order('created_at',{ascending:true});
    for(const msg of (pendingMsgs||[])){
      const payload=msg.payload as Record<string,unknown>;
      if(payload.instruction) await processInstruction(company.id, payload.instruction as string, msg.id, selfId, ajitId);
      else await supabase.from('agent_messages').update({status:'processed',processed_at:new Date().toISOString()}).eq('id',msg.id);
    }

    if(!body.instruction){
      const [jobs,invoices,proposals,alerts,commands] = await Promise.all([
        supabase.from('jobs').select('status').eq('company_id',company.id),
        supabase.from('invoices').select('status,total_amount').eq('company_id',company.id),
        supabase.from('feature_proposals').select('proposal_number,feature_name,status,impact_score,priority_score').eq('company_id',company.id).in('status',['proposed','under_review']).order('priority_score',{ascending:false}).limit(5),
        supabase.from('system_alerts').select('title,severity,status').eq('company_id',company.id).eq('status','open').limit(5),
        supabase.from('agent_commands').select('command_type,status,requires_approval').eq('company_id',company.id).eq('requires_approval',true).eq('status','queued'),
      ]);
      const activeJobs = jobs.data?.filter((j:any)=>!['closed','cancelled'].includes(j.status)).length||0;
      const revenue = invoices.data?.filter((i:any)=>i.status==='paid').reduce((s:number,i:any)=>s+(i.total_amount||0),0)||0;
      const overdue = invoices.data?.filter((i:any)=>i.status==='overdue').reduce((s:number,i:any)=>s+(i.total_amount||0),0)||0;
      const pendingApprovals = commands.data?.length||0;

      const{text:aiSummary,model} = await callAI(
        `Executive summary for Ajit (MD): Active Jobs: ${activeJobs}, Revenue Collected: ₹${revenue.toLocaleString()}, Overdue: ₹${overdue.toLocaleString()}, Open Alerts: ${alerts.data?.length||0}, Pending Approvals: ${pendingApprovals}, Top Proposals: ${proposals.data?.slice(0,2).map((p:any)=>p.feature_name).join(', ')}. Write 2 sharp strategic sentences.`,
        'You are Aslesha, CEO Agent for Veloryn Global Logistics. Be direct and strategic.'
      );

      const now = new Date();
      let report = `👑 *Aslesha — CEO Report*\n${company.name} | ${now.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short'})}\n\n`;
      report += `*📊 SNAPSHOT*\n• Active: *${activeJobs}*\n• Revenue: *₹${revenue.toLocaleString('en-IN')}*\n• Outstanding: *₹${overdue.toLocaleString('en-IN')}*\n`;
      if (pendingApprovals>0) report += `\n*⚡ APPROVALS NEEDED: ${pendingApprovals}*\n`;
      if (alerts.data?.length) { report += `\n*🚨 ALERTS*\n`; alerts.data.forEach((a:any)=>{report+=`${a.severity==='critical'?'🔴':'🟠'} ${a.title}\n`;}); }
      if (proposals.data?.length) { report += `\n*🧠 TOP PROPOSALS*\n`; proposals.data.slice(0,3).forEach((p:any)=>{report+=`• ${p.feature_name} (${p.impact_score}/10)\n`;}); }
      if (aiSummary) report += `\n*💡 AI INSIGHT (${model})*\n${aiSummary}\n`;
      report += `\n— Aslesha | ShipCore Pro`;

      if (MD_PHONE) await sendWhatsApp(MD_PHONE, report);
      await supabase.from('agent_logs').insert({company_id:company.id,agent_id:AGENT_KEY,status:'completed',summary:`Aslesha: CEO report sent. Active: ${activeJobs}, Revenue: ₹${revenue.toLocaleString()}, Model: ${model}. ${pendingMsgs?.length||0} instructions processed.`,details:{active_jobs:activeJobs,revenue,overdue,model},completed_at:new Date().toISOString(),duration_ms:Date.now()-startTime});
    } else {
      await supabase.from('agent_logs').insert({company_id:company.id,agent_id:AGENT_KEY,status:'completed',summary:`Aslesha: ${pendingMsgs?.length||0} instructions processed (instruction-only trigger).`,details:{instructions_processed:pendingMsgs?.length||0},completed_at:new Date().toISOString(),duration_ms:Date.now()-startTime});
    }
  }
  return new Response(JSON.stringify({success:true,agent:'Aslesha'}),{headers:{'Content-Type':'application/json'}});
});
