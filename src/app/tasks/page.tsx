'use client';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle, Clock, AlertCircle, XCircle, Filter,
  Plus, ChevronDown, User, Calendar, Tag, RefreshCw,
  FileText, CreditCard, Ship, Truck, Scale, Bot
} from 'lucide-react';

type Task = {
  id: string;
  title: string;
  description: string;
  task_type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string;
  created_by: string;
  assigned_to?: string;
  related_to?: string;
  related_id?: string;
  created_at: string;
};

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-500/30',    dot: 'bg-red-500'    },
  high:     { label: 'High',     color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', dot: 'bg-orange-500' },
  medium:   { label: 'Medium',   color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-500' },
  low:      { label: 'Low',      color: 'bg-slate-600/20 text-slate-400 border-slate-600/30',  dot: 'bg-slate-500'  },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  payment_reminder: <CreditCard className="w-3.5 h-3.5" />,
  customs_action:   <Scale className="w-3.5 h-3.5" />,
  detention_alert:  <Ship className="w-3.5 h-3.5" />,
  do_followup:      <FileText className="w-3.5 h-3.5" />,
  follow_up:        <User className="w-3.5 h-3.5" />,
  tax_compliance:   <Scale className="w-3.5 h-3.5" />,
  gst_filing:       <Scale className="w-3.5 h-3.5" />,
  tds_deposit:      <CreditCard className="w-3.5 h-3.5" />,
  agent_generated:  <Bot className="w-3.5 h-3.5" />,
  manual:           <Tag className="w-3.5 h-3.5" />,
};

const TYPE_LABELS: Record<string, string> = {
  payment_reminder: 'Payment',
  customs_action:   'Customs',
  detention_alert:  'Detention',
  do_followup:      'DO Follow-up',
  follow_up:        'Follow-up',
  tax_compliance:   'Tax',
  gst_filing:       'GST',
  tds_deposit:      'TDS',
  tds_return:       'TDS Return',
  advance_tax:      'Advance Tax',
  pf_esic_deposit:  'PF/ESIC',
  agent_generated:  'AI Agent',
  manual:           'Manual',
};

const AGENT_LABELS: Record<string, string> = {
  pranali_agent: 'Pranali',
  ganesh_agent:  'Ganesh',
  andrew_agent:  'Andrew',
  dipika_agent:  'Dipika',
  alex_agent:    'Alex',
  komal_agent:   'Komal',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('pending');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', task_type: 'manual', due_date: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: '100' });
      if (filter !== 'all') params.set('status', filter);
      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      setTasks(data.data || []);
    } catch { toast.error('Failed to load tasks'); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      toast.success(status === 'completed' ? '✅ Task completed' : 'Task updated');
      load();
    } catch { toast.error('Failed to update task'); }
  };

  const createTask = async () => {
    if (!newTask.title) return toast.error('Title required');
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      toast.success('Task created');
      setShowCreate(false);
      setNewTask({ title: '', description: '', priority: 'medium', task_type: 'manual', due_date: '' });
      load();
    } catch { toast.error('Failed to create task'); }
  };

  const filtered = tasks.filter(t => {
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (typeFilter !== 'all' && t.task_type !== typeFilter) return false;
    return true;
  });

  // Group by priority for board view
  const critical = filtered.filter(t => t.priority === 'critical');
  const high      = filtered.filter(t => t.priority === 'high');
  const medium    = filtered.filter(t => t.priority === 'medium');
  const low       = filtered.filter(t => t.priority === 'low');

  const isOverdue = (due: string) => due && new Date(due) < new Date();

  const TaskCard = ({ task }: { task: Task }) => {
    const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
    const overdue = isOverdue(task.due_date);
    const agentName = AGENT_LABELS[task.created_by] || task.created_by?.replace('_agent', '') || 'System';
    return (
      <div className={`bg-slate-900 border rounded-lg p-4 hover:border-slate-600 transition-all ${
        overdue && task.status === 'pending' ? 'border-red-500/40' : 'border-slate-700/60'
      }`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${pc.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
              {pc.label}
            </span>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
              {TYPE_ICONS[task.task_type] || <Tag className="w-3 h-3" />}
              {TYPE_LABELS[task.task_type] || task.task_type}
            </span>
          </div>
          {task.status === 'pending' && (
            <div className="flex gap-1">
              <button
                onClick={() => updateStatus(task.id, 'in_progress')}
                className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/40 transition-colors border border-blue-600/30"
              >Start</button>
              <button
                onClick={() => updateStatus(task.id, 'completed')}
                className="text-xs px-2 py-1 bg-green-600/20 text-green-400 rounded hover:bg-green-600/40 transition-colors border border-green-600/30"
              >Done</button>
            </div>
          )}
          {task.status === 'in_progress' && (
            <button
              onClick={() => updateStatus(task.id, 'completed')}
              className="text-xs px-2 py-1 bg-green-600/20 text-green-400 rounded hover:bg-green-600/40 transition-colors border border-green-600/30"
            >Complete</button>
          )}
          {task.status === 'completed' && (
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
          )}
        </div>
        <p className="text-sm font-semibold text-slate-200 mb-1">{task.title}</p>
        {task.description && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Bot className="w-3 h-3" />
            {agentName}
          </span>
          {task.due_date && (
            <span className={`flex items-center gap-1 ${overdue && task.status !== 'completed' ? 'text-red-400 font-semibold' : ''}`}>
              <Calendar className="w-3 h-3" />
              {overdue && task.status !== 'completed' ? '⚠ ' : ''}
              {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
    );
  };

  const PriorityColumn = ({ title, items, color }: { title: string; items: Task[]; color: string }) => (
    <div className="flex-1 min-w-0">
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${color}`}>
        <span className="text-sm font-bold text-slate-300">{title}</span>
        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div className="space-y-3">
        {items.map(t => <TaskCard key={t.id} task={t} />)}
        {items.length === 0 && <p className="text-xs text-slate-600 text-center py-6">No tasks</p>}
      </div>
    </div>
  );

  // Stats
  const stats = [
    { label: 'Total', value: tasks.length, icon: <Tag className="w-4 h-4" />, color: 'text-slate-400' },
    { label: 'Critical', value: tasks.filter(t => t.priority === 'critical' && t.status === 'pending').length, icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-400' },
    { label: 'Overdue', value: tasks.filter(t => isOverdue(t.due_date) && t.status === 'pending').length, icon: <Clock className="w-4 h-4" />, color: 'text-orange-400' },
    { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-400' },
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
          <button onClick={load} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg border border-slate-700 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <span className={s.color}>{s.icon}</span>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
          {(['all','pending','in_progress','completed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                filter === s ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >{s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-400 focus:outline-none"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-400 focus:outline-none"
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          <PriorityColumn title="🔴 Critical" items={critical} color="border-red-800" />
          <PriorityColumn title="🟠 High" items={high} color="border-orange-800" />
          <PriorityColumn title="🟡 Medium" items={medium} color="border-yellow-800" />
          <PriorityColumn title="⚪ Low" items={low} color="border-slate-700" />
        </div>
      )}

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">New Task</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Title *</label>
                <input
                  value={newTask.title}
                  onChange={e => setNewTask(s => ({ ...s, title: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500"
                  placeholder="Task description"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Details</label>
                <textarea
                  value={newTask.description}
                  onChange={e => setNewTask(s => ({ ...s, description: e.target.value }))}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={e => setNewTask(s => ({ ...s, priority: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={e => setNewTask(s => ({ ...s, due_date: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-700 transition-colors"
              >Cancel</button>
              <button
                onClick={createTask}
                className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >Create Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
