'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import {
  Package, TrendingUp, Users, Globe2, Boxes,
  FileText, Activity, ArrowRight, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/components/layout/AuthProvider';
import { StatCard, Card, CardHeader, Badge, PageLoader } from '@/components/ui';
import {
  formatCurrency, formatDate,
  JOB_STATUS_CONFIG, INVOICE_STATUS_CONFIG,
} from '@/lib/utils';
import type { DashboardStats, MonthlyData } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [trend, setTrend]   = useState<MonthlyData[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/jobs?per_page=5').then(r => r.json()),
    ]).then(([dashData, jobsData]) => {
      if (dashData.data) {
        const { trend: t, ...s } = dashData.data;
        setStats(s);
        setTrend(t || []);
      }
      if (jobsData.data) setRecentJobs(jobsData.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-shell-900 via-shell-800 to-brand-900 p-6 text-white bg-grid-pattern">
        <div className="relative z-10">
          <p className="text-slate-400 text-sm font-mono">{greeting()},</p>
          <h2 className="text-2xl font-display font-bold mt-1">{user?.full_name}</h2>
          <p className="text-slate-400 text-sm mt-1">{user?.company?.name}</p>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10">
          <Activity className="w-32 h-32" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Jobs"
          value={stats?.total_jobs ?? 0}
          icon={<Package className="w-5 h-5" />}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Active Shipments"
          value={stats?.active_jobs ?? 0}
          icon={<Activity className="w-5 h-5" />}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(stats?.monthly_revenue ?? 0)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Monthly Profit"
          value={formatCurrency(stats?.monthly_profit ?? 0)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="bg-violet-50 text-violet-600"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Customers"
          value={stats?.total_customers ?? 0}
          icon={<Users className="w-5 h-5" />}
          color="bg-sky-50 text-sky-600"
        />
        <StatCard
          label="Agents"
          value={stats?.total_agents ?? 0}
          icon={<Globe2 className="w-5 h-5" />}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Open Consols"
          value={stats?.open_consols ?? 0}
          icon={<Boxes className="w-5 h-5" />}
          color="bg-teal-50 text-teal-600"
        />
        <StatCard
          label="Pending Invoices"
          value={stats?.pending_invoices ?? 0}
          icon={<FileText className="w-5 h-5" />}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue trend */}
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue & Profit Trend" subtitle="Last 6 months" />
          <div className="p-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number, n: string) => [formatCurrency(v), n === 'revenue' ? 'Revenue' : 'Profit']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="profit"  stroke="#10B981" strokeWidth={2} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Jobs per month */}
        <Card>
          <CardHeader title="Jobs per Month" />
          <div className="p-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                />
                <Bar dataKey="jobs" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Jobs */}
      <Card>
        <CardHeader
          title="Recent Jobs"
          subtitle="Last 5 jobs created"
          action={
            <Link href="/jobs" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          }
        />
        {recentJobs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No jobs yet. <Link href="/jobs" className="text-brand-600 underline">Create your first job</Link></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentJobs.map(job => {
              const sc = JOB_STATUS_CONFIG[job.status as keyof typeof JOB_STATUS_CONFIG];
              return (
                <Link key={job.id} href={`/jobs/${job.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-800">{job.job_number}</span>
                      {sc && <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {job.customer?.company_name || job.consignee_name || '—'} • {job.pol} → {job.pod}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-slate-400">{formatDate(job.created_at)}</div>
                    <div className="text-xs text-slate-500">{job.cbm} CBM</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/jobs',      icon: Package,   label: 'New Job',      color: 'hover:border-blue-300 hover:bg-blue-50' },
          { href: '/consol',    icon: Boxes,     label: 'New Consol',   color: 'hover:border-teal-300 hover:bg-teal-50' },
          { href: '/invoices',  icon: FileText,  label: 'New Invoice',  color: 'hover:border-violet-300 hover:bg-violet-50' },
          { href: '/customers', icon: Users,     label: 'Add Customer', color: 'hover:border-amber-300 hover:bg-amber-50' },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 bg-white transition-all ${a.color}`}>
            <a.icon className="w-6 h-6 text-slate-500" />
            <span className="text-sm font-medium text-slate-600">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
