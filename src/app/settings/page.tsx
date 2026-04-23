'use client';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Building2, FileText, Bell, Shield, Save,
  Users, Landmark, ChevronRight
} from 'lucide-react';

const TABS = [
  { id: 'company',       label: 'Company',       icon: Building2 },
  { id: 'tax',           label: 'Tax & IDs',     icon: Shield    },
  { id: 'bank',          label: 'Bank',          icon: Landmark  },
  { id: 'notifications', label: 'Notifications', icon: Bell      },
  { id: 'invoicing',     label: 'Invoicing',     icon: FileText  },
  { id: 'users',         label: 'Users',         icon: Users     },
];

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
];

type Settings = Record<string, string | boolean | number>;
type User = { id: string; full_name: string; email: string; role: string };

// Label style reused across tabs
const lbl = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';
const inp = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500 placeholder-slate-600';
const sel = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500';

function Toggle({ on, onToggle, color = 'bg-brand-600' }: { on: boolean; onToggle: () => void; color?: string }) {
  return (
    <button onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? color : 'bg-slate-700'}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [s, setS]   = useState<Settings>({});
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [edited, setEdited]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, uRes] = await Promise.all([fetch('/api/settings'), fetch('/api/users')]);
      const sData = await sRes.json();
      const uData = await uRes.json();
      if (sData.data) setS(sData.data);
      if (uData.data) setUsers(uData.data);
    } catch { toast.error('Failed to load settings'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Single change handler — prevents re-render from creating new component references
  const change = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setS(prev => ({ ...prev, [key]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }));
    setEdited(true);
  };
  const toggle = (key: string) => { setS(prev => ({ ...prev, [key]: !prev[key] })); setEdited(true); };
  const val = (key: string) => String(s[key] ?? '');

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('Settings saved'); setEdited(false);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to save'); }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Company profile, tax, bank, notifications</p>
        </div>
        {edited && (
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 transition-colors">
            <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 space-y-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-6">

          {/* COMPANY */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700/50 pb-2">Company Identity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={lbl}>Legal Name</label>
                  <input className={inp} value={val('legal_name')} onChange={change('legal_name')} placeholder="Veloryn Global Logistics Pvt Ltd" />
                </div>
                <div>
                  <label className={lbl}>Trade Name / DBA</label>
                  <input className={inp} value={val('trade_name')} onChange={change('trade_name')} placeholder="Lykaa Shipping" />
                </div>
                <div>
                  <label className={lbl}>City</label>
                  <input className={inp} value={val('city')} onChange={change('city')} placeholder="Navi Mumbai" />
                </div>
                <div className="md:col-span-2">
                  <label className={lbl}>Address Line 1</label>
                  <input className={inp} value={val('address_line1')} onChange={change('address_line1')} placeholder="123 Logistics Park, Nhava Sheva" />
                </div>
                <div>
                  <label className={lbl}>State</label>
                  <select className={sel} value={val('state')} onChange={change('state')}>
                    <option value="">— Select —</option>
                    {INDIAN_STATES.map(st => <option key={st}>{st}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Pincode</label>
                  <input className={inp} value={val('pincode')} onChange={change('pincode')} placeholder="400707" />
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700/50 pb-2 mt-2">Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>MD WhatsApp (with country code)</label>
                  <input className={inp} value={val('md_whatsapp')} onChange={change('md_whatsapp')} placeholder="919820XXXXXX" />
                </div>
                <div>
                  <label className={lbl}>Accounts Email</label>
                  <input className={inp} type="email" value={val('accounts_email')} onChange={change('accounts_email')} placeholder="accounts@veloryn.com" />
                </div>
                <div>
                  <label className={lbl}>Operations Email</label>
                  <input className={inp} type="email" value={val('ops_email')} onChange={change('ops_email')} placeholder="ops@veloryn.com" />
                </div>
              </div>
            </div>
          )}

          {/* TAX */}
          {activeTab === 'tax' && (
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700/50 pb-2">GST & Customs Identifiers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>GSTIN</label>
                  <input className={inp} value={val('gstin')} onChange={change('gstin')} placeholder="27XXXXX0000X1ZX" />
                </div>
                <div>
                  <label className={lbl}>GST State</label>
                  <select className={sel} value={val('gst_state')} onChange={change('gst_state')}>
                    <option value="">— Select —</option>
                    {INDIAN_STATES.map(st => <option key={st}>{st}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>PAN Number</label>
                  <input className={inp} value={val('pan')} onChange={change('pan')} placeholder="XXXXX0000X" />
                </div>
                <div>
                  <label className={lbl}>IEC Code</label>
                  <input className={inp} value={val('iec_code')} onChange={change('iec_code')} placeholder="Import Export Code" />
                </div>
                <div>
                  <label className={lbl}>CHA License No.</label>
                  <input className={inp} value={val('cha_license')} onChange={change('cha_license')} placeholder="CHA License Number" />
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700/50 pb-2 mt-2">Tax Settings</h3>
              <div className="flex gap-8">
                <div>
                  <label className={lbl + ' mb-2'}>TDS Applicable</label>
                  <Toggle on={!!s.tds_applicable} onToggle={() => toggle('tds_applicable')} />
                </div>
                <div>
                  <label className={lbl + ' mb-2'}>Advance Tax Applicable</label>
                  <Toggle on={!!s.advance_tax_applicable} onToggle={() => toggle('advance_tax_applicable')} />
                </div>
              </div>
            </div>
          )}

          {/* BANK */}
          {activeTab === 'bank' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700/50 pb-2">Primary Bank Account</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Bank Name</label>
                  <input className={inp} value={val('bank_name')} onChange={change('bank_name')} placeholder="HDFC Bank" />
                </div>
                <div>
                  <label className={lbl}>Branch</label>
                  <input className={inp} value={val('bank_branch')} onChange={change('bank_branch')} placeholder="Belapur" />
                </div>
                <div className="md:col-span-2">
                  <label className={lbl}>Account Number</label>
                  <input className={inp} value={val('bank_account')} onChange={change('bank_account')} placeholder="00000XXXXXXXXXX" />
                </div>
                <div>
                  <label className={lbl}>IFSC Code</label>
                  <input className={inp} value={val('bank_ifsc')} onChange={change('bank_ifsc')} placeholder="HDFC0000000" />
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700/50 pb-2">Channels</h3>
              <div className="flex gap-10">
                <div>
                  <label className={lbl + ' mb-2'}>WhatsApp (WATI)</label>
                  <Toggle on={!!s.whatsapp_enabled} onToggle={() => toggle('whatsapp_enabled')} color="bg-green-600" />
                </div>
                <div>
                  <label className={lbl + ' mb-2'}>Email (Resend)</label>
                  <Toggle on={!!s.email_enabled} onToggle={() => toggle('email_enabled')} color="bg-blue-600" />
                </div>
              </div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700/50 pb-2">Alert Contacts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>MD WhatsApp (Tesla/Aslesha alerts)</label>
                  <input className={inp} value={val('md_whatsapp')} onChange={change('md_whatsapp')} placeholder="919820XXXXXX" />
                </div>
                <div>
                  <label className={lbl}>Accounts Email (Pranali reports)</label>
                  <input className={inp} type="email" value={val('accounts_email')} onChange={change('accounts_email')} />
                </div>
              </div>
            </div>
          )}

          {/* INVOICING */}
          {activeTab === 'invoicing' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700/50 pb-2">Document Numbering</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Invoice Prefix</label>
                  <input className={inp} value={val('invoice_prefix')} onChange={change('invoice_prefix')} placeholder="INV" />
                </div>
                <div>
                  <label className={lbl}>Quote Prefix</label>
                  <input className={inp} value={val('quote_prefix')} onChange={change('quote_prefix')} placeholder="QT" />
                </div>
                <div>
                  <label className={lbl}>Job Prefix</label>
                  <input className={inp} value={val('job_prefix')} onChange={change('job_prefix')} placeholder="SC" />
                </div>
                <div>
                  <label className={lbl}>Next Invoice Number</label>
                  <input className={inp} type="number" value={val('next_invoice_number')} onChange={change('next_invoice_number')} placeholder="1" />
                </div>
              </div>
            </div>
          )}

          {/* USERS */}
          {activeTab === 'users' && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700/50 pb-2 mb-4">System Users</h3>
              <div className="space-y-3">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-600/20 border border-brand-600/40 flex items-center justify-center text-brand-400 font-bold text-sm">
                        {u.full_name?.charAt(0) ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{u.full_name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      u.role === 'admin' ? 'bg-brand-600/20 text-brand-400' :
                      u.role === 'operator' ? 'bg-green-600/20 text-green-400' : 'bg-slate-700 text-slate-400'
                    }`}>{u.role}</span>
                  </div>
                ))}
                {users.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No users found</p>}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
