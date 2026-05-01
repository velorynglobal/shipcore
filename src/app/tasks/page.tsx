'use client';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle, Clock, AlertCircle, Tag, RefreshCw,
  Plus, Calendar, Bot, Trash2, X
} from 'lucide-react';

type Task = {
  id: string; title: string; description?: string;
  task_type: string; priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string; created_by?: string; created_at: string;
};

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', card: 'border-red-700/40',    badge: 'bg-red-500/20 text-red-400',    dot: 'bg-red-500'    },
  high:     { label: 'High',     card: 'border-orange-700/40', badge: 'bg-orange-500/20 text-orange-400', dot: 'bg-orange-500' },
  medium:   { label: 'Medium',   card: 'border-yellow-700/40', badge: 'bg-yellow-500/20 text-yellow-400', dot: 'bg-yellow-500' },
  low:      { label: 'Low',      card: 'border-slate-700/40',  badge: 'bg-slate-600/20 text-slate-400',  dot: 'bg-slate-500'  },
};

const TYPE_LABELS: Record<string, string> = {
  payment_reminder: 'Payment', customs_action: 'Customs', detention_alert: 'Detention',
  do_followup: 'DO Follow-up', follow_up: 'Follow-up', tax_compliance: 'Tax',
  gst_filing: 'GST', tds_deposit: 'TDS', tds_return: 'TDS Return',
  advance_tax: 'Advance Tax', pf_esic_deposit: 'PF/ESIC', agent_generated: 'AI Agent', manual: 'Manual',
};

const AGENT_NAMES: Record<string, string> = {
  pranali_agent: 'Pranali', ganesh_agent: 'Ganesh', andrew_agent: 'Andrew',
  dipika_agent: 'Dipika', alex_agent: 'Alex', komal_agent: 'Komal', tesla_agent: 'Tesla',
};

// ── Task card — defined OUTSIDE parent to prevent remount ──
function TaskCard({
  task, onComplete, onDelete,
}: {
  task: Task;
  onComplete: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const pc = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
  const overdue = task.due_date && task.status !== 'completed' && new Date(task.due_date) < new Date();
  const agentName = AGENT_NAMES[task.created_by ?? ''] ?? (task.created_by?.replace('_agent', '') ?? 'Manual');
  const isPending = task.status === 'pending';
  const isInProgress = task.status === 'in_progress';
  const isDone = task.status === 'completed';

  return (
    <div className={`bg-slate-900 border rounded-xl p-4 transition-all ${isDone ? 'opacity-60' : ''} ${pc.card}`}>
      {/* Priority + type badges */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${pc.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
          {pc.label}
        </span>
        <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
          {TYPE_LABELS[task.task_type] ?? task.task_type}
        </span>
        {isDone && <CheckCircle className="w-3.5 h-3.5 text-green-500 ml-auto" />}
      </div>

      {/* Title */}
      <p className={`text-sm font-semibold mb-1 ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}>
        {task.title}
      </p>
      {task.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1"><Bot className="w-3 h-3" />{agentName}</span>
        {task.due_date && (
          <span className={`flex items-center gap-1 ${overdue ? 'text-red-400 font-bold' : ''}`}>
            <Calendar className="w-3 h-3" />
            {overdue ? '⚠ ' : ''}
            {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      {/* Actions */}
      {!isDone && (
        <div className="flex gap-2">
          {isPending && (
            <button onClick={() => onComplete(task.id, 'in_progress')}
              className="flex-1 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg border border-blue-600/30 transition-colors font-semibold">
              Start
            </button>
          )}
          <button onClick={() => onComplete(task.id, 'completed')}
            className="flex-1 py-1.5 text-xs bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg border border-green-600/30 transition-colors font-semibold">
            ✓ Done
          </button>
          <button onClick={() => onDelete(task.id)}
            className="py-1.5 px-2.5 text-xs bg-red-600/10 hover:bg-red-600/30 text-red-400 rounded-lg border border-red-600/20 transition-colors"
            title="Delete task">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {isDone && (
        <button onClick={() => onDelete(task.id)}
          className="w-full py-1.5 text-xs bg-slate-800 hover:bg-red-600/20 text-slate-500 hover:text-red-400 rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1.5">
          <Trash2 className="w-3 h-3" /> Remove
        </button>
      )}
    </div>
  );
}

// ── Priority column — also outside ──
function PriorityColumn({
  title, borderColor, tasks, onComplete, onDelete,
}: {
  title: string; borderColor: string; tasks: Task[];
  onComplete: (id: string, s: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex-1 min-w-[260px]">
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${borderColor}`}>
        <span className="text-sm font-bold text-slate-300">{title}</span>
        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div className="space-y-3">
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} onComplete={onComplete} onDelete={onDelete} />
        ))}
        {tasks.length === 0 && <p className="text-xs text-slate-600 text-center py-8">No tasks</p>}
      </div>
    </div>
  );
}

// ── Main page ──
export default function TasksPage() {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<'pending' | 'in_progress' | 'completed' | 'all'>('pending');
  const [showCreate, setCreate] = useState(false);

  // Controlled inputs as simple state — NOT inside sub-component
  const [newTitle, setNewTitle]   = useState('');
  const [newDesc, setNewDesc]     = useState('');
  const [newPriority, setNewPrio] = useState('medium');
  const [newType, setNewType]     = useState('manual');
  const [newDue, setNewDue]       = useState('');
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: '200' });
      if (filter !== 'all') params.set('status', filter);
      const res  = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      setTasks(data.data ?? []);
    } catch { toast.error('Failed to load tasks'); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateTask = useCallback(async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(status === 'completed' ? '✅ Task completed' : 'Task started');
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: status as Task['status'] } : t));
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      toast.success('Task deleted');
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch { toast.error('Failed to delete task'); }
  }, []);

  const createTask = async () => {
    if (!newTitle.trim()) return toast.error('Title required');
    setSaving(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, description: newDesc, priority: newPriority, task_type: newType, due_date: newDue || undefined }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('Task created');
      setCreate(false);
      setNewTitle(''); setNewDesc(''); setNewPrio('medium'); setNewType('manual'); setNewDue('');
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    setSaving(false);
  };

  const shown = tasks.filter(t => filter === 'all' || t.status === filter);
  const critical = shown.filter(t => t.priority === 'critical');
  const high     = shown.filter(t => t.priority === 'high');
  const medium   = shown.filter(t => t.priority === 'medium');
  const low      = shown.filter(t => t.priority === 'low');

  const stats = [
    { label: 'Total',     value: tasks.length,                                               color: 'text-slate-300' },
    { label: 'Critical',  value: tasks.filter(t => t.priority === 'critical' && t.status === 'pending').length, color: 'text-red-400' },
    { label: 'Overdue',   value: tasks.filter(t => t.due_date && t.status === 'pending' && new Date(t.due_date) < new Date()).length, color: 'text-orange-400' },
    { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length,          color: 'text-green-400' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-slate-400 text-sm mt-1">Agent-generated and manual tasks across all departments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit mb-6">
        {(['pending', 'in_progress', 'completed', 'all'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${filter === s ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          <PriorityColumn title="🔴 Critical" borderColor="border-red-800"    tasks={critical} onComplete={updateTask} onDelete={deleteTask} />
          <PriorityColumn title="🟠 High"     borderColor="border-orange-800" tasks={high}     onComplete={updateTask} onDelete={deleteTask} />
          <PriorityColumn title="🟡 Medium"   borderColor="border-yellow-800" tasks={medium}   onComplete={updateTask} onDelete={deleteTask} />
          <PriorityColumn title="⚪ Low"      borderColor="border-slate-700"  tasks={low}      onComplete={updateTask} onDelete={deleteTask} />
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">New Task</h3>
              <button onClick={() => setCreate(false)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Title *</label>
                <input
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Task description"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500 placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Details</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Priority</label>
                  <select value={newPriority} onChange={e => setNewPrio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Due Date</label>
                  <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none">
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setCreate(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-700 transition-colors">
                Cancel
              </button>
              <button onClick={createTask} disabled={saving}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                {saving ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
