import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorizeAgentRequest, callAgentRouter, getAuthorizedCompanies } from '../_shared/runtime.ts';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const AGENT_KEY = 'german_agent';
const ROUTER_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-router`;
const ROUTER_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM')||'documents@shipcore.app';

async function callAI(prompt:string,system?:string):Promise<{text:string;model:string}>{try{return await callAgentRouter(prompt,system||'',AGENT_KEY);}catch{return{text:'',model:'error'};}}
async function sendEmail(to:string,subject:string,body:string):Promise<boolean>{if(!RESEND_KEY||!to)return false;try{const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${RESEND_KEY}`},body:JSON.stringify({from:EMAIL_FROM,to,subject,html:`<p>${body.replace(/\n/g,'<br>')}</p>`})});return res.ok;}catch{return false;}}

async function getAgentIds(companyId:string):Promise<{selfId:string|null;ajitId:string|null}>{
  const{data}=await supabase.from('ai_agents').select('id,agent_key').eq('company_id',companyId).in('agent_key',[AGENT_KEY,'ajit_agent']);
  const self=data?.find((a:any)=>a.agent_key===AGENT_KEY);
  const ajit=data?.find((a:any)=>a.agent_key==='ajit_agent');
  return{selfId:self?.id??null,ajitId:ajit?.id??null};
}

async function processInstruction(companyId: string, instruction: string, messageId: string, selfId:string|null, ajitId:string|null): Promise<void> {
  const {text,model} = await callAI(
    `You are German, Documentation Agent for Veloryn Global Logistics. You received this instruction from Ajit (MD):\n"${instruction}"\nRespond with what you will do. Be concise.`,
    'You are German, documentation agent for a freight forwarding ERP. Be concise and practical.'
  );
  await supabase.from('agent_messages').update({status:'processed',processed_at:new Date().toISOString()}).eq('id',messageId);
  if(selfId&&ajitId){
    const{error}=await supabase.from('agent_messages').insert({company_id:companyId,from_agent:AGENT_KEY,to_agent:'ajit_agent',from_agent_id:selfId,to_agent_id:ajitId,message_type:'response',priority:'medium',subject:`German: ${text.slice(0,80)}`,payload:{instruction,response:text,model},status:'pending'});
    if(error)console.error('Reply insert failed:',error.message);
  }
}

Deno.serve(async (req: Request) => {
  const auth = await authorizeAgentRequest(req);
  if (auth instanceof Response) return auth;
  const startTime = Date.now();
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

    const{data:invoicesNeedingDocs} = await supabase.from('invoices').select('id,invoice_number,customer:customers(email,company_name)').eq('company_id',company.id).eq('status','sent').is('document_sent_at',null).limit(10);
    let docsProcessed = 0;
    for (const inv of (invoicesNeedingDocs||[])) {
      const custEmail = (inv.customer as any)?.email;
      const custName = (inv.customer as any)?.company_name || 'Customer';
      if (custEmail) {
        const sent = await sendEmail(custEmail, `Invoice ${inv.invoice_number} - ${company.name}`, `Dear ${custName},\n\nPlease find your invoice ${inv.invoice_number} attached.\n\nRegards,\n${company.name}`);
        if (sent) {
          await supabase.from('invoices').update({ document_sent_at: new Date().toISOString() }).eq('id', inv.id);
          docsProcessed++;
        }
      }
    }

    await supabase.from('agent_logs').insert({company_id:company.id,agent_id:AGENT_KEY,status:'completed',summary:`German: ${pendingMsgs?.length||0} instructions processed, ${docsProcessed} documents sent.`,details:{instructions_processed:pendingMsgs?.length||0,docs_sent:docsProcessed},completed_at:new Date().toISOString(),duration_ms:Date.now()-startTime});
  }
  return new Response(JSON.stringify({success:true,agent:'German'}),{headers:{'Content-Type':'application/json'}});
});
