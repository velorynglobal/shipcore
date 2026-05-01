'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Package, TrendingUp, AlertCircle, CheckCircle, IndianRupee, Ship, Clock, RefreshCw, Bot, Zap } from 'lucide-react';

type DashboardData = { active_jobs:number; total_jobs_month:number; revenue_collected:number; outstanding:number; overdue_invoices:number; critical_tasks:number; pending_tasks:number; detention_risk:number; total_profit_month:number; };
type PnLJob = { id:string; job_number:string; customer_name:string; sell_total:number; profit:number; margin_pct:number; };
type AgingRow = { invoice_number:string; customer_name:string; balance_due:number; days_overdue:number; };

const KPI = ({label,value,sub,icon,color,bg}:{label:string;value:string|number;sub?:string;icon:React.ReactNode;color:string;bg:string;}) => (
  <div className={`${bg} border rounded-xl p-5 flex items-start gap-4`}>
    <span className={`${color} mt-0.5`}>{icon}</span>
    <div><p className={`text-2xl font-bold ${color}`}>{value}</p><p className="text-xs font-semibold text-slate-300 mt-0.5">{label}</p>{sub&&<p className="text-xs text-slate-500 mt-0.5">{sub}</p>}</div>
  </div>
);

export default function DashboardPage() {
  const [kpis,setKpis]     = useState<DashboardData|null>(null);
  const [pnl,setPnl]       = useState<PnLJob[]>([]);
  const [aging,setAging]   = useState<AgingRow[]>([]);
  const [loading,setLoading] = useState(true);
  const [updated,setUpdated] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kRes,pRes,aRes] = await Promise.all([
        fetch('/api/reports?report=dashboard'),
        fetch('/api/reports/pnl?period=this_year'),
        fetch('/api/reports/aging'),
      ]);
      const kData=await kRes.json(); const pData=await pRes.json(); const aData=await aRes.json();
      if(kData.data) setKpis(kData.data);
      if(pData.data) setPnl(pData.data.slice(0,8));
      if(aData.data) setAging(aData.data.slice(0,6));
      setUpdated(new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}));
    } catch(e){ console.error(e); }
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  const fmtK=(n:number)=>n>=100000?`₹${(n/100000).toFixed(1)}L`:`₹${n.toLocaleString('en-IN')}`;

  if(loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Veloryn Global Logistics — ShipCore Pro{updated&&<span className="ml-2 text-slate-600">· {updated}</span>}</p>
        </div>
        <button onClick={load} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/></button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPI label="Active Shipments"   value={kpis?.active_jobs??0}               icon={<Ship className="w-5 h-5"/>}         color="text-blue-400"   bg="bg-blue-950/30 border-blue-900/40"/>
        <KPI label="Revenue This Month" value={fmtK(kpis?.revenue_collected??0)}   icon={<IndianRupee className="w-5 h-5"/>}  color="text-green-400"  bg="bg-green-950/30 border-green-900/40" sub={`Profit: ${fmtK(kpis?.total_profit_month??0)}`}/>
        <KPI label="Outstanding"        value={fmtK(kpis?.outstanding??0)}         icon={<TrendingUp className="w-5 h-5"/>}   color="text-yellow-400" bg="bg-yellow-950/30 border-yellow-900/40" sub={`${kpis?.overdue_invoices??0} overdue`}/>
        <KPI label="Pending Tasks"      value={kpis?.pending_tasks??0}             icon={<Clock className="w-5 h-5"/>}        color="text-orange-400" bg="bg-orange-950/30 border-orange-900/40" sub={`${kpis?.critical_tasks??0} critical`}/>
        <KPI label="Jobs This Month"    value={kpis?.total_jobs_month??0}          icon={<Package className="w-5 h-5"/>}      color="text-slate-300"  bg="bg-slate-900 border-slate-800"/>
        <KPI label="Detention Risk"     value={kpis?.detention_risk??0}            icon={<AlertCircle className="w-5 h-5"/>}  color="text-red-400"    bg="bg-red-950/30 border-red-900/40" sub="containers at risk"/>
        <KPI label="Overdue Invoices"   value={kpis?.overdue_invoices??0}          icon={<AlertCircle className="w-5 h-5"/>}  color="text-red-400"    bg="bg-slate-900 border-slate-800"/>
        <KPI label="Agent Network"      value="12 / 12"                            icon={<Bot className="w-5 h-5"/>}          color="text-purple-400" bg="bg-purple-950/30 border-purple-900/40" sub="AI Router — 7 models"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-bold text-slate-200">Recent Jobs — P&L</h2>
            <a href="/reports" className="text-xs text-brand-400 hover:text-brand-300">Full report →</a>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-800">{['Job','Customer','Revenue','Margin'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>
              {pnl.length===0?<tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-xs">No jobs data yet</td></tr>
              :pnl.map(j=>(
                <tr key={j.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 font-mono text-xs text-brand-400">{j.job_number}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-300 max-w-[120px] truncate">{j.customer_name||'—'}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-slate-200">{j.sell_total?fmtK(j.sell_total):'—'}</td>
                  <td className="px-4 py-2.5 text-xs">{j.margin_pct!=null?<span className={`font-semibold ${j.margin_pct>=15?'text-green-400':j.margin_pct>=5?'text-yellow-400':'text-red-400'}`}>{j.margin_pct}%</span>:'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-bold text-slate-200">Overdue Invoices — Aging</h2>
            <a href="/reports" className="text-xs text-brand-400 hover:text-brand-300">Full report →</a>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-800">{['Invoice','Customer','Balance','Overdue'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>
              {aging.length===0?<tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-xs"><CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-500 opacity-60"/>No overdue invoices</td></tr>
              :aging.map(a=>(
                <tr key={a.invoice_number} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-300">{a.invoice_number}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-300 max-w-[120px] truncate">{a.customer_name||'—'}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-slate-200">{fmtK(a.balance_due)}</td>
                  <td className="px-4 py-2.5 text-xs"><span className={`font-semibold ${a.days_overdue>60?'text-red-400':a.days_overdue>30?'text-orange-400':'text-yellow-400'}`}>{a.days_overdue}d</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="font-bold text-slate-200 mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-brand-400"/>Quick Navigation</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            {label:'New Job',href:'/jobs',color:'bg-blue-600/20 text-blue-400 border-blue-600/30 hover:bg-blue-600/40'},
            {label:'New Enquiry',href:'/enquiries',color:'bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/40'},
            {label:'Tasks',href:'/tasks',color:'bg-orange-600/20 text-orange-400 border-orange-600/30 hover:bg-orange-600/40'},
            {label:'AI Agents',href:'/agent-dashboard',color:'bg-purple-600/20 text-purple-400 border-purple-600/30 hover:bg-purple-600/40'},
            {label:'Reports',href:'/reports',color:'bg-slate-700/40 text-slate-300 border-slate-600/30 hover:bg-slate-700/60'},
          ].map(q=><a key={q.label} href={q.href} className={`${q.color} border rounded-lg px-4 py-2.5 text-sm font-semibold text-center transition-colors`}>{q.label}</a>)}
        </div>
      </div>
    </div>
  );
}
