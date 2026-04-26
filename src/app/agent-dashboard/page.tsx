'use client';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Bot, Send, RefreshCw, Brain, MessageSquare, Clock, CheckCircle, AlertCircle, Activity, Play, User } from 'lucide-react';

type Agent = { agent_key: string; display_name: string; agent_domain: string; agent_class: string; status: string; last_run_at?: string; run_count: number; error_count: number; };
type Message = { id: string; from_agent: string; to_agent: string; subject: string; message_type: string; status: string; created_at: string; priority?: string; };
type Proposal = { id: string; proposal_number: string; feature_name: string; category: string; impact_score: number; status: string; business_problem: string; };
type Log = { id: string; agent_id: string; status: string; summary: string; duration_ms: number; created_at: string; };

const AGENT_URLS: Record<string,string> = {
  tesla_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/tesla-agent',
  einstein_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/einstein-agent',
  steve_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/steve-agent',
  ganesh_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/ganesh-agent',
  pranali_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/pranali-agent',
  alex_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/alex-agent',
  komal_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/komal-agent',
  aslesha_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/aslesha-agent',
  ajit_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/ajit-agent',
  german_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/german-agent',
  andrew_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/andrew-agent',
  dipika_agent:'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/dipika-agent',
};

const DOMAIN_COLOR: Record<string,string> = {
  control:'bg-purple-500/20 text-purple-400 border-purple-500/30',
  sales:'bg-blue-500/20 text-blue-400 border-blue-500/30',
  operations:'bg-green-500/20 text-green-400 border-green-500/30',
  finance:'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  customer_service:'bg-teal-500/20 text-teal-400 border-teal-500/30',
  compliance:'bg-orange-500/20 text-orange-400 border-orange-500/30',
  documentation:'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  innovation:'bg-pink-500/20 text-pink-400 border-pink-500/30',
  platform:'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  executive:'bg-rose-500/20 text-rose-400 border-rose-500/30',
  management:'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

const MSG_TYPE_COLOR: Record<string,string> = {
  feature_proposal:'text-pink-400', alert:'text-red-400', task:'text-blue-400',
  update:'text-green-400', broadcast:'text-purple-400', response:'text-teal-400',
};

export default function AgentDashboardPage() {
  const [agents, setAgents]       = useState<Agent[]>([]);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [logs, setLogs]           = useState<Log[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<'agents'|'messages'|'proposals'|'logs'|'instruct'>('agents');
  const [triggering, setTriggering] = useState<string|null>(null);
  const [instrTarget,   setInstrTarget]   = useState('tesla_agent');
  const [instrText,     setInstrText]     = useState('');
  const [instrPriority, setInstrPriority] = useState('high');
  const [sending,       setSending]       = useState(false);
  const [instrHistory,  setInstrHistory]  = useState<{target:string;text:string;sent_at:string}[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, mRes, pRes, lRes] = await Promise.all([
        fetch('/api/agent-dashboard'),
        fetch('/api/agent-messages?limit=30'),
        fetch('/api/feature-proposals?limit=20'),
        fetch('/api/agent-logs?limit=30'),
      ]);
      const aData = await aRes.json(); setAgents(aData.agents ?? []);
      const mData = await mRes.json(); setMessages(mData.data ?? []);
      const pData = await pRes.json(); setProposals(pData.data ?? []);
      const lData = await lRes.json(); setLogs(lData.data ?? []);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const triggerAgent = async (agentKey: string) => {
    const url = AGENT_URLS[agentKey];
    if (!url) return toast.error('No URL for this agent');
    setTriggering(agentKey);
    try {
      const res = await fetch('/api/agent-trigger', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_key: agentKey, url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`✅ ${agentKey.replace('_agent','')} triggered`);
      setTimeout(load, 2000);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    setTriggering(null);
  };

  const sendInstruction = async () => {
    if (!instrText.trim()) return toast.error('Enter an instruction');
    setSending(true);
    try {
      const res = await fetch('/api/agent-instruct', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: instrText, target_agent: instrTarget, priority: instrPriority }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`📨 Sent to ${instrTarget.replace('_agent','')}`);
      setInstrHistory(h => [{ target: instrTarget, text: instrText, sent_at: new Date().toLocaleTimeString('en-IN') }, ...h.slice(0,9)]);
      setInstrText('');
      setTimeout(load, 1500);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Brain className="w-6 h-6 text-brand-400" /> AGaaS Agent Network</h1>
          <p className="text-slate-400 text-sm mt-1">12 named agents — Veloryn Global Logistics</p>
        </div>
        <button onClick={load} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label:'Active Agents', value:`${agents.filter(a=>a.status==='active').length}/12`, color:'text-green-400' },
          { label:'Messages (24h)', value:messages.length, color:'text-blue-400' },
          { label:'Pending Proposals', value:proposals.filter(p=>p.status==='proposed').length, color:'text-pink-400' },
          { label:'Errors (24h)', value:logs.filter(l=>l.status==='failed').length, color:'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit mb-6">
        {([{id:'agents',label:'Agents'},{id:'instruct',label:'🎯 Instruct'},{id:'messages',label:'Messages'},{id:'proposals',label:'Proposals'},{id:'logs',label:'Logs'}] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${tab===t.id?'bg-brand-600 text-white':'text-slate-400 hover:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(a => (
            <div key={a.agent_key} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-200">{a.display_name}</p>
                    {a.agent_class === 'human' && <User className="w-3.5 h-3.5 text-slate-400" />}
                  </div>
                  <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border mt-1 font-medium ${DOMAIN_COLOR[a.agent_domain]||'bg-slate-700 text-slate-400 border-slate-600'}`}>
                    {a.agent_domain.replace('_',' ')}
                  </span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status==='active'?'bg-green-500/20 text-green-400':'bg-slate-700 text-slate-400'}`}>{a.status}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{a.run_count} runs</span>
                {a.error_count > 0 && <span className="text-red-400">{a.error_count} errors</span>}
                {a.last_run_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(a.last_run_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>}
              </div>
              {AGENT_URLS[a.agent_key] && (
                <button onClick={() => triggerAgent(a.agent_key)} disabled={triggering===a.agent_key}
                  className="w-full py-1.5 bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 border border-brand-600/30 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {triggering===a.agent_key ? <><RefreshCw className="w-3 h-3 animate-spin" />Running…</> : <><Play className="w-3 h-3" />Trigger Now</>}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'instruct' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><Send className="w-4 h-4 text-brand-400" />Send Instruction to Agent</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Target Agent</label>
                <select value={instrTarget} onChange={e => setInstrTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500">
                  {agents.map(a => <option key={a.agent_key} value={a.agent_key}>{a.display_name} — {a.agent_domain}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Priority</label>
                <div className="flex gap-2">
                  {['low','medium','high','critical'].map(p => (
                    <button key={p} onClick={() => setInstrPriority(p)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${instrPriority===p
                        ? p==='critical'?'bg-red-600/30 text-red-300 border-red-600/50':p==='high'?'bg-orange-600/30 text-orange-300 border-orange-600/50':p==='medium'?'bg-yellow-600/30 text-yellow-300 border-yellow-600/50':'bg-slate-600/30 text-slate-300 border-slate-600/50'
                        : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Instruction</label>
                <textarea value={instrText} onChange={e => setInstrText(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter' && (e.ctrlKey||e.metaKey)) sendInstruction(); }}
                  rows={5} placeholder={`Tell ${agents.find(a=>a.agent_key===instrTarget)?.display_name??'agent'} what to do…`}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500 placeholder-slate-600 resize-none" />
                <p className="text-xs text-slate-600 mt-1">Ctrl+Enter to send</p>
              </div>
              <button onClick={sendInstruction} disabled={sending || !instrText.trim()}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? <><RefreshCw className="w-4 h-4 animate-spin" />Sending…</> : <><Send className="w-4 h-4" />Send Instruction</>}
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                {[
                  {label:'📊 Morning briefing',target:'tesla_agent',text:'Send me the morning briefing now'},
                  {label:'🚨 Detention check',target:'ganesh_agent',text:'Check all containers for detention risk immediately'},
                  {label:'💰 Aging report',target:'pranali_agent',text:'Send me the current aging report'},
                  {label:'🧠 Run R&D',target:'einstein_agent',text:'Analyze system and generate improvement proposals'},
                  {label:'📧 Process inbox',target:'komal_agent',text:'Process all unread emails in inbox now'},
                ].map(q => (
                  <button key={q.label} onClick={() => { setInstrTarget(q.target); setInstrText(q.text); }}
                    className="text-xs px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-700 transition-colors">
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" />Session History</h3>
            {instrHistory.length === 0 ? (
              <div className="text-center py-12"><MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-600" /><p className="text-xs text-slate-600">No instructions sent this session</p></div>
            ) : (
              <div className="space-y-3">
                {instrHistory.map((h, i) => (
                  <div key={i} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-brand-400">→ {h.target.replace('_agent','')}</span>
                      <span className="text-xs text-slate-500">{h.sent_at}</span>
                    </div>
                    <p className="text-xs text-slate-300">{h.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-800">
              {['From','To','Subject','Type','Priority','Status','Time'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {messages.map(m => (
                <tr key={m.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 text-xs font-semibold text-slate-300">{m.from_agent?.replace('_agent','')??'—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{m.to_agent?.replace('_agent','')??'—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-300 max-w-xs truncate">{m.subject??'—'}</td>
                  <td className="px-4 py-2.5"><span className={`text-xs font-semibold ${MSG_TYPE_COLOR[m.message_type]??'text-slate-400'}`}>{m.message_type}</span></td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${m.priority==='critical'?'bg-red-500/20 text-red-400':m.priority==='high'?'bg-orange-500/20 text-orange-400':'bg-slate-700 text-slate-400'}`}>{m.priority??'—'}</span>
                  </td>
                  <td className="px-4 py-2.5"><span className={`text-xs px-1.5 py-0.5 rounded ${m.status==='processed'?'bg-green-500/20 text-green-400':m.status==='failed'?'bg-red-500/20 text-red-400':'bg-yellow-500/20 text-yellow-400'}`}>{m.status}</span></td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{new Date(m.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</td>
                </tr>
              ))}
              {messages.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No messages in last 24 hours</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'proposals' && (
        <div className="space-y-3">
          {proposals.map(p => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-slate-500">{p.proposal_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status==='proposed'?'bg-blue-500/20 text-blue-400':p.status==='under_review'?'bg-yellow-500/20 text-yellow-400':'bg-green-500/20 text-green-400'}`}>{p.status}</span>
                    <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">{p.category}</span>
                  </div>
                  <p className="font-semibold text-slate-200">{p.feature_name}</p>
                  <p className="text-xs text-slate-400 mt-1">{p.business_problem}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-2xl font-bold ${p.impact_score>=8?'text-green-400':p.impact_score>=6?'text-yellow-400':'text-slate-400'}`}>{p.impact_score}<span className="text-sm text-slate-500">/10</span></div>
                  <p className="text-xs text-slate-500">Impact</p>
                </div>
              </div>
            </div>
          ))}
          {proposals.length === 0 && <div className="text-center py-16 text-slate-500"><Brain className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No proposals — trigger Einstein</p></div>}
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-2">
          {logs.map(l => (
            <div key={l.id} className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${l.status==='completed'?'bg-green-950/20 border-green-900/30':l.status==='failed'?'bg-red-950/20 border-red-900/30':'bg-slate-900 border-slate-800'}`}>
              {l.status==='completed'?<CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />:l.status==='failed'?<AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />:<Clock className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-brand-400">{l.agent_id?.replace('_agent','')}</span>
                  {l.duration_ms && <span className="text-xs text-slate-500">{l.duration_ms}ms</span>}
                  <span className="text-xs text-slate-500 ml-auto">{new Date(l.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{l.summary}</p>
              </div>
            </div>
          ))}
          {logs.length === 0 && <p className="text-center py-10 text-slate-500 text-sm">No logs yet</p>}
        </div>
      )}
    </div>
  );
}
