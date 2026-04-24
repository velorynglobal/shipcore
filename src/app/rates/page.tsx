'use client';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { TrendingUp, Plus, Search, RefreshCw, X, Save, AlertTriangle, CheckCircle, Ship, Plane } from 'lucide-react';

type Rate = {
  id?: string; rate_type: string; origin_port: string; destination_port: string;
  carrier_name?: string; service_name?: string; cargo_type: string;
  currency: string; buy_rate?: number; sell_rate?: number; margin?: number;
  transit_days?: number; free_days_origin?: number; free_days_destination?: number;
  valid_from?: string; valid_to?: string; is_active?: boolean; notes?: string;
  vendor_id?: string;
};

type Vendor = { id: string; name: string; vendor_type: string };

const RATE_TYPES  = ['sea','air','lcl','fcl','road'];
const CARGO_TYPES = ['general','lcl','fcl_20','fcl_40','fcl_40hc','hazardous','refrigerated','oversized','bulk'];
const CURRENCIES  = ['USD','EUR','GBP','INR','CNY','JPY'];

const TYPE_ICON: Record<string, React.ReactNode> = {
  sea: <Ship className="w-3.5 h-3.5" />, air: <Plane className="w-3.5 h-3.5" />,
  lcl: <Ship className="w-3.5 h-3.5" />, fcl: <Ship className="w-3.5 h-3.5" />,
  road: <span className="text-xs">🚛</span>,
};

const inp = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500';
const sel = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500';
const lbl = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

const EMPTY: Rate = { rate_type:'sea', origin_port:'', destination_port:'', cargo_type:'general', currency:'USD', is_active:true };

function isExpired(r: Rate) { return r.valid_to ? new Date(r.valid_to) < new Date() : false; }
function daysLeft(r: Rate) {
  if (!r.valid_to) return null;
  return Math.ceil((new Date(r.valid_to).getTime() - Date.now()) / 86400000);
}

export default function RatesPage() {
  const [rates, setRates]       = useState<Rate[]>([]);
  const [vendors, setVendors]   = useState<Vendor[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);

  // Form state — individual to prevent cursor jump
  const [fId,         setFId]         = useState('');
  const [fType,       setFType]       = useState('sea');
  const [fOrigin,     setFOrigin]     = useState('');
  const [fDest,       setFDest]       = useState('');
  const [fCarrier,    setFCarrier]    = useState('');
  const [fService,    setFService]    = useState('');
  const [fCargo,      setFCargo]      = useState('general');
  const [fCurrency,   setFCurrency]   = useState('USD');
  const [fBuy,        setFBuy]        = useState('');
  const [fSell,       setFSell]       = useState('');
  const [fTransit,    setFTransit]    = useState('');
  const [fFreeDaysO,  setFFreeDaysO]  = useState('0');
  const [fFreeDaysD,  setFFreeDaysD]  = useState('14');
  const [fValidFrom,  setFValidFrom]  = useState('');
  const [fValidTo,    setFValidTo]    = useState('');
  const [fVendorId,   setFVendorId]   = useState('');
  const [fNotes,      setFNotes]      = useState('');
  const [fActive,     setFActive]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, vRes] = await Promise.all([
        fetch('/api/rates?per_page=200'),
        fetch('/api/vendors?per_page=200'),
      ]);
      const rData = await rRes.json(); setRates(rData.data ?? []);
      const vData = await vRes.json(); setVendors(vData.data ?? []);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setFId(''); setFType('sea'); setFOrigin(''); setFDest(''); setFCarrier('');
    setFService(''); setFCargo('general'); setFCurrency('USD'); setFBuy('');
    setFSell(''); setFTransit(''); setFFreeDaysO('0'); setFFreeDaysD('14');
    setFValidFrom(''); setFValidTo(''); setFVendorId(''); setFNotes(''); setFActive(true);
    setShowForm(true);
  };

  const openEdit = (r: Rate) => {
    setFId(r.id ?? ''); setFType(r.rate_type); setFOrigin(r.origin_port);
    setFDest(r.destination_port); setFCarrier(r.carrier_name ?? '');
    setFService(r.service_name ?? ''); setFCargo(r.cargo_type);
    setFCurrency(r.currency); setFBuy(String(r.buy_rate ?? ''));
    setFSell(String(r.sell_rate ?? '')); setFTransit(String(r.transit_days ?? ''));
    setFFreeDaysO(String(r.free_days_origin ?? 0));
    setFFreeDaysD(String(r.free_days_destination ?? 14));
    setFValidFrom(r.valid_from ?? ''); setFValidTo(r.valid_to ?? '');
    setFVendorId(r.vendor_id ?? ''); setFNotes(r.notes ?? '');
    setFActive(r.is_active ?? true);
    setShowForm(true);
  };

  const computeMargin = () => {
    const buy = parseFloat(fBuy) || 0;
    const sell = parseFloat(fSell) || 0;
    return sell - buy;
  };

  const save = async () => {
    if (!fOrigin || !fDest) return toast.error('Origin and destination required');
    setSaving(true);
    try {
      const body = {
        rate_type: fType, origin_port: fOrigin, destination_port: fDest,
        carrier_name: fCarrier || undefined, service_name: fService || undefined,
        cargo_type: fCargo, currency: fCurrency,
        buy_rate: fBuy ? parseFloat(fBuy) : undefined,
        sell_rate: fSell ? parseFloat(fSell) : undefined,
        margin: computeMargin(),
        transit_days: fTransit ? parseInt(fTransit) : undefined,
        free_days_origin: parseInt(fFreeDaysO) || 0,
        free_days_destination: parseInt(fFreeDaysD) || 14,
        valid_from: fValidFrom || undefined, valid_to: fValidTo || undefined,
        vendor_id: fVendorId || undefined, notes: fNotes || undefined,
        is_active: fActive,
      };
      const url    = fId ? `/api/rates/${fId}` : '/api/rates';
      const method = fId ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data   = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(fId ? 'Rate updated' : 'Rate added');
      setShowForm(false); load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    setSaving(false);
  };

  const filtered = rates.filter(r => {
    const q = search.toLowerCase();
    if (q && !r.origin_port?.toLowerCase().includes(q) && !r.destination_port?.toLowerCase().includes(q) && !r.carrier_name?.toLowerCase().includes(q)) return false;
    if (typeFilter !== 'all' && r.rate_type !== typeFilter) return false;
    return true;
  });

  const expiring = rates.filter(r => { const d = daysLeft(r); return d !== null && d >= 0 && d <= 7 && r.is_active; });
  const expired  = rates.filter(r => isExpired(r) && r.is_active);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Rate Cards</h1>
          <p className="text-slate-400 text-sm mt-1">Sea, Air, LCL & FCL freight rates — managed by Alex</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold">
            <Plus className="w-4 h-4" /> Add Rate
          </button>
        </div>
      </div>

      {/* Alert banners */}
      {expired.length > 0 && (
        <div className="mb-4 p-3 bg-red-950/40 border border-red-800/50 rounded-xl flex items-center gap-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-red-300"><strong>{expired.length} rate(s) expired</strong> — update or deactivate them</span>
        </div>
      )}
      {expiring.length > 0 && (
        <div className="mb-4 p-3 bg-orange-950/40 border border-orange-800/50 rounded-xl flex items-center gap-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="text-orange-300"><strong>{expiring.length} rate(s) expiring within 7 days</strong> — renew before expiry</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Rates',  value: rates.length,                           color: 'text-slate-300' },
          { label: 'Active',       value: rates.filter(r => r.is_active && !isExpired(r)).length, color: 'text-green-400' },
          { label: 'Expiring Soon',value: expiring.length,                        color: 'text-orange-400' },
          { label: 'Expired',      value: expired.length,                         color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search route, carrier…"
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-500" />
        </div>
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
          {['all',...RATE_TYPES].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${typeFilter === t ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Rates Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-800">
            {['Type','Route','Carrier','Cargo','Buy','Sell','Margin','Transit','Valid To','Status'].map(h => (
              <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(r => {
              const expired_ = isExpired(r);
              const dl = daysLeft(r);
              const margin = (r.sell_rate ?? 0) - (r.buy_rate ?? 0);
              return (
                <tr key={r.id} onClick={() => openEdit(r)}
                  className="border-b border-slate-800/50 hover:bg-slate-800/40 cursor-pointer transition-colors">
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-300">
                      {TYPE_ICON[r.rate_type]}{r.rate_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-200 text-xs">{r.origin_port} → {r.destination_port}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-400">{r.carrier_name || '—'}</td>
                  <td className="px-3 py-3 text-xs text-slate-400">{r.cargo_type}</td>
                  <td className="px-3 py-3 text-xs text-slate-300">{r.buy_rate ? `${r.currency} ${r.buy_rate.toLocaleString()}` : '—'}</td>
                  <td className="px-3 py-3 text-xs font-semibold text-slate-200">{r.sell_rate ? `${r.currency} ${r.sell_rate.toLocaleString()}` : '—'}</td>
                  <td className="px-3 py-3 text-xs">
                    {r.buy_rate && r.sell_rate
                      ? <span className={`font-semibold ${margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>{r.currency} {margin.toLocaleString()}</span>
                      : '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-400">{r.transit_days ? `${r.transit_days}d` : '—'}</td>
                  <td className="px-3 py-3 text-xs">
                    {r.valid_to ? (
                      <span className={expired_ ? 'text-red-400 font-semibold' : dl !== null && dl <= 7 ? 'text-orange-400 font-semibold' : 'text-slate-400'}>
                        {new Date(r.valid_to).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'2-digit' })}
                        {dl !== null && !expired_ && dl <= 7 && ` (${dl}d)`}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      expired_ ? 'bg-red-500/20 text-red-400' :
                      !r.is_active ? 'bg-slate-600/20 text-slate-500' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {expired_ ? 'Expired' : r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />No rates found — add your first rate card
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form Drawer */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-end z-50">
          <div className="bg-slate-900 border-l border-slate-700 h-full w-full max-w-xl overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{fId ? 'Edit Rate' : 'Add Rate Card'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-6">

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-800">Route</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Type</label>
                    <select className={sel} value={fType} onChange={e => setFType(e.target.value)}>
                      {RATE_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Cargo Type</label>
                    <select className={sel} value={fCargo} onChange={e => setFCargo(e.target.value)}>
                      {CARGO_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Origin Port *</label><input className={inp} value={fOrigin} onChange={e => setFOrigin(e.target.value)} placeholder="e.g. CNSHA" /></div>
                  <div><label className={lbl}>Destination Port *</label><input className={inp} value={fDest} onChange={e => setFDest(e.target.value)} placeholder="e.g. INJNP" /></div>
                  <div><label className={lbl}>Carrier / Airline</label><input className={inp} value={fCarrier} onChange={e => setFCarrier(e.target.value)} placeholder="MSC, Maersk, AI…" /></div>
                  <div><label className={lbl}>Service / Flight</label><input className={inp} value={fService} onChange={e => setFService(e.target.value)} placeholder="AE-1, daily…" /></div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-800">Rates</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Currency</label>
                    <select className={sel} value={fCurrency} onChange={e => setFCurrency(e.target.value)}>
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    {fBuy && fSell && (
                      <div className={`w-full px-3 py-2 rounded-lg text-sm font-semibold ${computeMargin() >= 0 ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                        Margin: {fCurrency} {computeMargin().toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div><label className={lbl}>Buy Rate</label><input type="number" className={inp} value={fBuy} onChange={e => setFBuy(e.target.value)} placeholder="Cost from carrier" /></div>
                  <div><label className={lbl}>Sell Rate</label><input type="number" className={inp} value={fSell} onChange={e => setFSell(e.target.value)} placeholder="Rate to customer" /></div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-800">Transit & Free Days</p>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className={lbl}>Transit Days</label><input type="number" className={inp} value={fTransit} onChange={e => setFTransit(e.target.value)} /></div>
                  <div><label className={lbl}>Free Days (Origin)</label><input type="number" className={inp} value={fFreeDaysO} onChange={e => setFFreeDaysO(e.target.value)} /></div>
                  <div><label className={lbl}>Free Days (Dest)</label><input type="number" className={inp} value={fFreeDaysD} onChange={e => setFFreeDaysD(e.target.value)} /></div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-800">Validity</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Valid From</label><input type="date" className={inp} value={fValidFrom} onChange={e => setFValidFrom(e.target.value)} /></div>
                  <div><label className={lbl}>Valid To</label><input type="date" className={inp} value={fValidTo} onChange={e => setFValidTo(e.target.value)} /></div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-800">Vendor & Notes</p>
                <div className="space-y-3">
                  <div><label className={lbl}>Linked Vendor</label>
                    <select className={sel} value={fVendorId} onChange={e => setFVendorId(e.target.value)}>
                      <option value="">None</option>
                      {vendors.filter(v => ['shipping_line','airline','nvocc','air_carrier','freight_forwarder'].includes(v.vendor_type)).map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div><label className={lbl}>Notes</label>
                    <textarea rows={2} className={inp} value={fNotes} onChange={e => setFNotes(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={lbl.replace(' mb-1','')}>Active</span>
                    <button onClick={() => setFActive(a => !a)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${fActive ? 'bg-green-600' : 'bg-slate-700'}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${fActive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-6 py-4 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-700">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : fId ? 'Update Rate' : 'Add Rate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
