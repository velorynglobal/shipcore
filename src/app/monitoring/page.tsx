"use client";
import React, { useState, useEffect } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Monitoring types
type SystemHealth = {
  ai_router_status: 'operational' | 'degraded' | 'down';
  active_agents: number;
  cron_jobs: { name: string; status: string; last_run: string }[];
  recent_errors: { time: string; message: string }[];
  ai_requests_today: number;
};

export default function MonitoringDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHealth() {
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      try {
        // Check AI Router status (via a simple ping)
        const routerRes = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-router`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instruction: 'ping' }) }
        ).catch(() => null);

        // Get active cron jobs
        const { data: cronJobs } = await supabase
          .from('cron.job')
          .select('jobname, active')
          .returns<{ jobname: string; active: boolean }[]>();

        // Get recent AI requests
        const today = new Date().toISOString().split('T')[0];
        const { count } = await supabase
          .from('ai_requests')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today);

        // Get recent errors
        const { data: errors } = await supabase
          .from('ai_requests')
          .select('created_at, error_message')
          .not('error_message', 'is', null)
          .order('created_at', { ascending: false })
          .limit(5);

        setHealth({
          ai_router_status: routerRes?.ok ? 'operational' : 'down',
          active_agents: cronJobs?.filter(j => j.active).length || 0,
          cron_jobs: cronJobs?.map(j => ({
            name: j.jobname,
            status: j.active ? 'active' : 'inactive',
            last_run: 'N/A',
          })) || [],
          recent_errors: errors?.map(e => ({
            time: new Date(e.created_at).toLocaleTimeString(),
            message: e.error_message || 'Unknown error',
          })) || [],
          ai_requests_today: count || 0,
        });
      } catch (err) {
        console.error('Health check failed:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHealth();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 18, color: '#6b7280' }}>Loading system health...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>System Monitoring</h1>

      {/* Health Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <div style={{ background: '#f0fdf4', padding: 20, borderRadius: 12, border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 600 }}>AI Router</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: health?.ai_router_status === 'operational' ? '#16a34a' : '#dc2626' }}>
            {health?.ai_router_status || 'unknown'}
          </div>
        </div>

        <div style={{ background: '#eff6ff', padding: 20, borderRadius: 12, border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 14, color: '#1d4ed8', fontWeight: 600 }}>Active Agents</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1e40af' }}>{health?.active_agents || 0}</div>
        </div>

        <div style={{ background: '#fefce8', padding: 20, borderRadius: 12, border: '1px solid #fed7aa' }}>
          <div style={{ fontSize: 14, color: '#d97706', fontWeight: 600 }}>AI Requests Today</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706' }}>{health?.ai_requests_today || 0}</div>
        </div>

        <div style={{ background: '#fdf2f8', padding: 20, borderRadius: 12, border: '1px solid #fbcfe0' }}>
          <div style={{ fontSize: 14, color: '#db2777', fontWeight: 600 }}>Recent Errors</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#db2777' }}>{health?.recent_errors?.length || 0}</div>
        </div>
      </div>

      {/* Cron Jobs */}
      <div style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Cron Jobs</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px' }}>Job Name</th>
              <th style={{ textAlign: 'left', padding: '8px 12px' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px 12px' }}>Last Run</th>
            </tr>
          </thead>
          <tbody>
            {health?.cron_jobs?.map((job, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px' }}>{job.name}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    background: job.status === 'active' ? '#dcfce7' : '#fee2e2',
                    color: job.status === 'active' ? '#166534' : '#991b1b',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    {job.status}
                  </span>
                </td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{job.last_run}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Errors */}
      {health?.recent_errors && health.recent_errors.length > 0 && (
        <div style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Recent Errors</h2>
          {health.recent_errors.map((err, i) => (
            <div key={i} style={{ padding: 12, background: '#fef2f2', borderRadius: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{err.time}</div>
              <div style={{ fontSize: 14, color: '#991b1b' }}>{err.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
