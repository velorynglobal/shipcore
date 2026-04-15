'use client';

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Bot, Activity, MessageSquare, Lightbulb, CheckCircle,
  XCircle, Clock, RefreshCw, ChevronRight, Zap, Brain,
  Eye, AlertTriangle, ArrowRight, Play,
} from 'lucide-react';
import { Card, CardHeader, Table, Th, Td, Tr, PageLoader } from '@/components/ui';
import { formatDate, cn } from '@/lib/utils';

const AGENT_META: Record<string, { label: string; icon: string; color: string; schedule: string }> = {
  orchestrator_agent: { label: 'Orchestrator',  icon: '🧠', color: 'bg-violet-100 text-violet-700 border-violet-200', schedule: '9 AM daily' },
  inbox_agent:        { label: 'Inbox',          icon: '📧', color: 'bg-blue-100 text-blue-700 border-blue-200',       schedule: 'On demand' },
  shipment_agent:     { label: 'Shipment',       icon: '🚢', color: 'bg-cyan-100 text-cyan-700 border-cyan-200',       schedule: 'Every 2 hrs' },
  detention_agent:    { label: 'Detention',      icon: '📦', color: 'bg-red-100 text-red-700 border-red-200',          schedule: '6 PM daily' },
  collections_agent:  { label: 'Collections',   icon: '💰', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', schedule: '9 AM daily' },
  rate_agent:         { label: 'Rate',           icon: '📊', color: 'bg-amber-100 text-amber-700 border-amber-200',    schedule: 'Monday 8 AM' },
  followup_agent:     { label: 'Follow-up',      icon: '🤝', color: 'bg-teal-100 text-teal-700 border-teal-200',       schedule: '9 AM daily' },
  rnd_agent:          { label: 'R&D',            icon: '🔬', color: 'bg-pink-100 text-pink-700 border-pink-200',       schedule: '2 AM daily' },
  developer_agent:    { label: 'Developer',      icon: '👨‍💻', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', schedule: 'On message' },
};

const AGENT_URLS: Record<string, string> = {
  orchestrator_agent: '/functions/v1/orchestrator-agent',
  inbox_agent:        '/functions/v1/inbox-agent',
  detention_agent:    '/functions/v1/detention-agent',
  collections_agent:  '/functions/v1/collections-agent',
  followup_agent:     '/functions/v1/followup-agent',
  rate_agent:         '/functions/v1/rate-agent',
  rnd_agent:          '/functions/v1/rnd-agent',
  developer_agent:    '/functions/v1/developer-agent',
};

export default function AgentDashboardPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview'|'messages'|'proposals'|'logs'>('overview');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [agentsRes, logsRes, msgsRes, proposalsRes, tasksRes] = await Promise.all([
        fetch('/api/agent-dashboard?type=agents'),
        fetch('/api/agent-dashboard?type=logs'),
        fetch('/api/agent-dashboard?type=messages'),
        fetch('/api/agent-dashboard?type=proposals'),
        fetch('/api/agent-dashboard?type=tasks'),
      ]);
      const [a, l, m, p, t] = await Promise.all([agentsRes.json(), logsRes.json(), msgsRes.json(), proposalsRes.json(), tasksRes.json()]);
      setAgents(a.data || []);
      setLogs(l.data || []);
      setMessages(m.data || []);
      setProposals(p.data || []);
      setTasks(t.data || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const triggerAgent = async (agentId: string) => {
    const url = AGENT_URLS[agentId];
    if (!url) { toast.error('Cannot trigger this agent manually'); return; }
    setRunning(agentId);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}${url}`, { method: 'GET' });
      const json = await res.json();
      if (json.success) {
        toast.success(`${AGENT_META[agentId]?.label || agentId} Agent completed!`);
        fetchAll();
      } else {
        toast.error(json.error || 'Agent run failed');
      }
    } catch (e: any) {
      toast.error(`Failed to trigger agent: ${e.message}`);
    }
    finally { setRunning(null); }
  };

  const activeAgents  = agents.filter(a => a.status === 'active').length;
  const pendingMsgs   = messages.filter(m => m.status === 'pending').length;
  const openProposals = proposals.filter(p => p.status === 'proposed').length;
  const criticalTasks = tasks.filter(t => t.priority === 'critical' && t.status === 'pending').length;

  const TABS = [
    { id: 'overview',   label: 'Overview',   icon: <Eye className="w-4 h-4" /> },
    { id: 'messages',   label: `Messages ${pendingMsgs > 0 ? `(${pendingMsgs})` : ''}`, icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'proposals',  label: `Proposals ${openProposals > 0 ? `(${openProposals})` : ''}`, icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'logs',       label: 'Logs',       icon: <Activity className="w-4 h-4" /> },
  ];

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-brand-600" /> AGaaS Agent Network
          </h2>
          <p className="text-sm text-slate-500">ShipCore Pro — Self-evolving AI agents</p>
        </div>
        <button onClick={fetchAll}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Network stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Agents',    value: activeAgents,  icon: <Bot className="w-5 h-5" />,           color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Pending Messages', value: pendingMsgs,   icon: <MessageSquare className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Open Proposals',   value: openProposals, icon: <Lightbulb className="w-5 h-5" />,     color: 'text-violet-600 bg-violet-50' },
          { label: 'Critical Tasks',   value: criticalTasks, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-red-600 bg-red-50' },
        ].map(s => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>{s.icon}</div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Overview — Agent Cards */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(AGENT_META).map(([agentId, meta]) => {
            const agent = agents.find(a => a.agent_id === agentId);
            const lastLog = logs.find(l => l.agent_id === agentId);
            const isRunning = running === agentId;
            const canTrigger = !!AGENT_URLS[agentId];

            return (
              <Card key={agentId} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center text-xl', meta.color)}>
                      {meta.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{meta.label} Agent</div>
                      <div className="text-xs text-slate-400">{meta.schedule}</div>
                    </div>
                  </div>
                  <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                    agent?.status === 'active' ? 'bg-emerald-500' :
                    agent?.status === 'error'  ? 'bg-red-500' : 'bg-slate-300'
                  )} />
                </div>

                {/* Last run info */}
                {lastLog ? (
                  <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mb-3 leading-relaxed">
                    <div className="flex items-center gap-1 mb-1">
                      {lastLog.status === 'completed' ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                      <span className={lastLog.status === 'completed' ? 'text-emerald-600' : 'text-red-600'}>{lastLog.status}</span>
                      <span className="text-slate-400 ml-auto">{formatDate(lastLog.started_at)}</span>
                    </div>
                    <div className="text-slate-500 truncate">{lastLog.summary || 'No summary'}</div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 mb-3">
                    <Clock className="w-3 h-3 inline mr-1" />Never run — awaiting first execution
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span>Runs: {agent?.run_count || 0}</span>
                  <span>Errors: {agent?.error_count || 0}</span>
                  <span>Last: {agent?.last_run_at ? formatDate(agent.last_run_at) : 'Never'}</span>
                </div>

                {/* Trigger button */}
                {canTrigger && (
                  <button
                    onClick={() => triggerAgent(agentId)}
                    disabled={!!running}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                      isRunning
                        ? 'bg-brand-100 text-brand-600 cursor-not-allowed'
                        : 'bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600'
                    )}>
                    {isRunning
                      ? <><RefreshCw className="w-3 h-3 animate-spin" /> Running...</>
                      : <><Play className="w-3 h-3" /> Trigger Now</>}
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <Card className="overflow-hidden">
          <CardHeader title="Inter-Agent Messages" subtitle="Communication between agents" />
          {messages.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No messages yet. Run the R&D agent to start the network.</p>
            </div>
          ) : (
            <Table>
              <thead><tr>
                <Th>From</Th><Th>To</Th><Th>Subject</Th>
                <Th>Type</Th><Th>Priority</Th><Th>Status</Th><Th>Time</Th>
              </tr></thead>
              <tbody>
                {messages.slice(0, 30).map(msg => {
                  const fromMeta = AGENT_META[msg.from_agent];
                  const toMeta   = msg.to_agent === 'all' ? { icon: '📡', label: 'All Agents' } : AGENT_META[msg.to_agent];
                  return (
                    <Tr key={msg.id}>
                      <Td>
                        <span className="text-sm">{fromMeta?.icon} {fromMeta?.label || msg.from_agent}</span>
                      </Td>
                      <Td>
                        <span className="text-sm">{toMeta?.icon} {toMeta?.label || msg.to_agent}</span>
                      </Td>
                      <Td><span className="text-sm text-slate-700 max-w-[200px] truncate block">{msg.subject}</span></Td>
                      <Td>
                        <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{msg.message_type}</span>
                      </Td>
                      <Td>
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                          msg.priority === 'critical' ? 'bg-red-50 text-red-700' :
                          msg.priority === 'high'     ? 'bg-orange-50 text-orange-700' :
                          msg.priority === 'medium'   ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        )}>{msg.priority}</span>
                      </Td>
                      <Td>
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                          msg.status === 'processed' ? 'bg-emerald-50 text-emerald-700' :
                          msg.status === 'pending'   ? 'bg-blue-50 text-blue-700' :
                          'bg-slate-100 text-slate-500'
                        )}>{msg.status}</span>
                      </Td>
                      <Td><span className="text-xs text-slate-400">{formatDate(msg.created_at)}</span></Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {/* Proposals Tab */}
      {activeTab === 'proposals' && (
        <div className="space-y-4">
          {proposals.length === 0 ? (
            <Card className="p-12 text-center">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-slate-400 text-sm">No proposals yet. Trigger the R&D Agent to generate feature proposals.</p>
              <button onClick={() => triggerAgent('rnd_agent')} disabled={!!running}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium mx-auto hover:bg-brand-700 transition-colors">
                <Brain className="w-4 h-4" /> Run R&D Agent
              </button>
            </Card>
          ) : (
            proposals.map(p => (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-brand-600 font-bold">{p.proposal_number}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                        p.status === 'completed'       ? 'bg-emerald-50 text-emerald-700' :
                        p.status === 'in_development'  ? 'bg-blue-50 text-blue-700' :
                        p.status === 'under_review'    ? 'bg-violet-50 text-violet-700' :
                        p.status === 'approved'        ? 'bg-teal-50 text-teal-700' :
                        'bg-amber-50 text-amber-700'
                      )}>{p.status?.replace('_',' ')}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{p.category}</span>
                    </div>
                    <div className="font-semibold text-slate-900 mb-1">{p.feature_name}</div>
                    <div className="text-sm text-slate-600 mb-2">{p.business_problem}</div>
                    {p.business_impact && (
                      <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">
                        💡 {p.business_impact}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    <div className="flex items-center gap-1">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-bold text-slate-900">Impact: {p.impact_score}/10</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Complexity: {p.complexity} • {p.effort_days}d effort
                    </div>
                    <div className="text-xs text-slate-400">
                      By {AGENT_META[p.proposed_by]?.label || p.proposed_by}
                    </div>
                  </div>
                </div>
                {p.implementation_plan && (
                  <details className="mt-3">
                    <summary className="text-xs text-brand-600 cursor-pointer font-medium">View Implementation Plan</summary>
                    <pre className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap overflow-auto max-h-48">
                      {p.implementation_plan}
                    </pre>
                  </details>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <Card className="overflow-hidden">
          <CardHeader title="Agent Run Logs" subtitle="Recent agent execution history" />
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No logs yet. Trigger an agent to see logs.</p>
            </div>
          ) : (
            <Table>
              <thead><tr>
                <Th>Agent</Th><Th>Status</Th><Th>Summary</Th>
                <Th>Duration</Th><Th>Triggered By</Th><Th>Time</Th>
              </tr></thead>
              <tbody>
                {logs.slice(0, 50).map(log => {
                  const meta = AGENT_META[log.agent_id];
                  return (
                    <Tr key={log.id}>
                      <Td>
                        <span className="text-sm font-medium">
                          {meta?.icon} {meta?.label || log.agent_id}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          {log.status === 'completed' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                          <span className={cn('text-xs', log.status === 'completed' ? 'text-emerald-700' : 'text-red-700')}>{log.status}</span>
                        </div>
                      </Td>
                      <Td><span className="text-xs text-slate-500 max-w-[240px] truncate block">{log.summary}</span></Td>
                      <Td><span className="text-xs font-mono text-slate-500">{log.duration_ms ? `${log.duration_ms}ms` : '—'}</span></Td>
                      <Td><span className="text-xs text-slate-400 capitalize">{log.triggered_by}</span></Td>
                      <Td><span className="text-xs text-slate-400">{formatDate(log.started_at)}</span></Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
