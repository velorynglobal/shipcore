import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorizeAgentRequest, callAgentRouter, getAuthorizedCompanies } from '../_shared/runtime.ts';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const AGENT_KEY = 'ganesh_agent';
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
    `You are Ganesh, CFS Operations Agent for Veloryn Global Logistics. You received this instruction from Ajit (MD):\n"${instruction}"\nRespond with what you will do and any findings. Be concise.`,
    'You are Ganesh, CFS operations agent for a logistics ERP. Respond helpfully and concisely.'
  );
  await supabase.from('agent_messages').update({status:'processed',processed_at:new Date().toISOString()}).eq('id',messageId);
  if(selfId&&ajitId){
    const{error}=await supabase.from('agent_messages').insert({company_id:companyId,from_agent:AGENT_KEY,to_agent:'ajit_agent',from_agent_id:selfId,to_agent_id:ajitId,message_type:'response',priority:'medium',subject:`Ganesh: ${text.slice(0,80)}`,payload:{instruction,response:text,model},status:'pending'});
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
  const today=new Date();const summary:any[]=[];

  for(const company of companies){
    await supabase.from('ai_agents').update({last_run_at:new Date().toISOString()}).eq('company_id',company.id).eq('agent_key',AGENT_KEY);
    const{selfId,ajitId}=await getAgentIds(company.id);

    const{data:pendingMsgs}=await supabase.from('agent_messages').select('*').eq('company_id',company.id).eq('to_agent',AGENT_KEY).eq('status','pending').eq('message_type','task').order('created_at',{ascending:true});
    for(const msg of (pendingMsgs||[])){
      const payload=msg.payload as Record<string,unknown>;
      if(payload.instruction) await processInstruction(company.id, payload.instruction as string, msg.id, selfId, ajitId);
      else await supabase.from('agent_messages').update({status:'processed',processed_at:new Date().toISOString()}).eq('id',msg.id);
    }

    const{data:containers}=await supabase.from('containers').select('*').eq('company_id',company.id).eq('is_returned',false);
    let alerts=0,overdue=0;const atRisk:string[]=[];
    for(const c of (containers||[])){
      if(!c.last_free_day_destination)continue;
      const lfd=new Date(c.last_free_day_destination);
      const daysRemaining=Math.ceil((lfd.getTime()-today.getTime())/86400000);
      const isOverdue=daysRemaining<0;const detentionDays=isOverdue?Math.abs(daysRemaining):0;
      const detentionAmount=detentionDays*(c.detention_rate_per_day||0);
      const riskLevel=isOverdue?'critical':daysRemaining<=1?'high':daysRemaining<=3?'medium':'low';
      const updates:Record<string,unknown>={risk_level:riskLevel,detention_days:detentionDays,detention_amount:detentionAmount};
      const cPhone=c.customer_mobile||'';
      if(isOverdue&&!c.alert_sent_overdue){
        overdue++;updates.alert_sent_overdue=true;
        const{text:aiMsg,model}=await callAI(`Container ${c.container_number} is ${detentionDays} days overdue on detention. LFD was ${c.last_free_day_destination}. Rate: $${c.detention_rate_per_day}/day. Total liability: $${detentionAmount}. Write a firm 2-sentence WhatsApp alert.`,'You are Ganesh, CFS operations agent for Veloryn Global Logistics. Be direct and urgent.');
        const msg=aiMsg||`🚨 DETENTION OVERDUE — Ganesh | Veloryn\nContainer: ${c.container_number}\nOverdue: ${detentionDays} days\nLiability: $${detentionAmount}`;
        if(cPhone)await sendWhatsApp(cPhone,msg);
        atRisk.push(`${c.container_number} (OVERDUE ${detentionDays}d via ${model})`);alerts++;
      }else if(daysRemaining<=3&&daysRemaining>=0&&!c.alert_sent_3day){
        updates.alert_sent_3day=true;
        const msg=`⚠️ ${daysRemaining===0?'LAST FREE DAY TODAY':daysRemaining+'-DAY WARNING'} — Ganesh | Veloryn\nContainer: ${c.container_number}\nLFD: ${c.last_free_day_destination}\nArrange empty return immediately!`;
        if(cPhone)await sendWhatsApp(cPhone,msg);
        atRisk.push(`${c.container_number} (${daysRemaining}d)`);alerts++;
      }
      await supabase.from('containers').update(updates).eq('id',c.id);
    }
    if(atRisk.length>0){
      if(selfId){
        const{data:teslaRow}=await supabase.from('ai_agents').select('id').eq('company_id',company.id).eq('agent_key','tesla_agent').maybeSingle();
        if(teslaRow)await supabase.from('agent_messages').insert({company_id:company.id,from_agent:AGENT_KEY,to_agent:'tesla_agent',from_agent_id:selfId,to_agent_id:teslaRow.id,message_type:'alert',priority:overdue>0?'critical':'high',subject:`Ganesh: ${atRisk.length} containers at detention risk`,payload:{at_risk:atRisk,overdue_count:overdue,alerts_sent:alerts},status:'pending'});
      }
      if(MD_PHONE&&overdue>0)await sendWhatsApp(MD_PHONE,`🚨 Ganesh Report — ${company.name}\n${overdue} containers OVERDUE\n${atRisk.join(', ')}`);
    }

    await supabase.from('agent_logs').insert({company_id:company.id,agent_id:AGENT_KEY,status:'completed',summary:`Ganesh: ${containers?.length||0} containers checked. ${alerts} alerts. ${overdue} overdue. ${pendingMsgs?.length||0} instructions processed.`,details:{containers:containers?.length||0,alerts,overdue,at_risk:atRisk},completed_at:new Date().toISOString(),duration_ms:Date.now()-startTime});
    summary.push({company:company.name,containers:containers?.length||0,alerts,overdue});
  }
  return new Response(JSON.stringify({success:true,agent:'Ganesh',summary}),{headers:{'Content-Type':'application/json'}});
});
