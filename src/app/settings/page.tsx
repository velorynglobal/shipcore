'use client';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Building2, FileText, CreditCard, Bell, Palette,
  Save, Edit2, Phone, Mail, MapPin, Shield, Hash,
  ChevronRight, Users, Landmark, Package
} from 'lucide-react';

const TABS = [
  { id: 'company',      label: 'Company',      icon: Building2  },
  { id: 'tax',          label: 'Tax & IDs',    icon: Shield     },
  { id: 'bank',         label: 'Bank',         icon: Landmark   },
  { id: 'notifications',label: 'Notifications',icon: Bell       },
  { id: 'invoicing',    label: 'Invoicing',    icon: FileText   },
  { id: 'users',        label: 'Users',        icon: Users      },
];

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
];

type Settings = Record<string, string | boolean | number | null>;
type User = { id: string; full_name: string; email: string; role: string; created_at: string };

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [settings, setSettings] = useState<Settings>({});
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, uRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/users'),
      ]);
      const sData = await sRes.json();
      const uData = await uRes.json();
      if (sData.data) setSettings(sData.data);
      if (uData.data) setUsers(uData.data);
    } catch { toast.error('Failed to load settings'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key: string, value: string | boolean | number) => {
    setSettings(s => ({ ...s, [key]: value }));
    setEdited(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('Settings saved');
      setEdited(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    }
    setSaving(false);
  };

  const Field = ({ label, name, type = 'text', placeholder = '', options }: {
    label: string; name: string; type?: string; placeholder?: string; options?: string[];
  }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{label}</label>
      {options ? (
        <select
          value={String(settings[name] || '')}
          onChange={e => set(name, e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500"
        >
          <option value="">— Select —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'toggle' ? (
        <button
          onClick={() => set(name, !settings[name])}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings[name] ? 'bg-brand-600' : 'bg-slate-700'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings[name] ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      ) : (
        <input
          type={type}
          value={String(settings[name] || '')}
          onChange={e => set(name, e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500 placeholder-slate-600"
        />
      )}
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-8">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 pb-2 border-b border-slate-700/50">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );

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
          <p className="text-slate-400 text-sm mt-1">Configure company, tax, notifications and more</p>
        </div>
        {edited && (
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-52 shrink-0">
          <nav className="space-y-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-6">

          {/* COMPANY TAB */}
          {activeTab === 'company' && (
            <>
              <Section title="Company Identity">
                <Field label="Legal Name" name="legal_name" placeholder="Veloryn Global Logistics Pvt Ltd" />
                <Field label="Trade Name / DBA" name="trade_name" placeholder="Lykaa Shipping" />
                <div className="md:col-span-2">
                  <Field label="Address Line 1" name="address_line1" placeholder="123 Logistics Park" />
                </div>
                <Field label="Address Line 2" name="address_line2" placeholder="Nhava Sheva" />
                <Field label="City" name="city" placeholder="Navi Mumbai" />
                <Field label="State" name="state" options={INDIAN_STATES} />
                <Field label="Pincode" name="pincode" placeholder="400707" />
              </Section>
              <Section title="Contact">
                <Field label="MD WhatsApp Number" name="md_whatsapp" placeholder="919820XXXXXX" />
                <Field label="Accounts Email" name="accounts_email" type="email" placeholder="accounts@veloryn.com" />
                <Field label="Operations Email" name="ops_email" type="email" placeholder="ops@veloryn.com" />
              </Section>
            </>
          )}

          {/* TAX TAB */}
          {activeTab === 'tax' && (
            <>
              <Section title="GST & Customs">
                <Field label="GSTIN" name="gstin" placeholder="27XXXXX0000X1ZX" />
                <Field label="State (for GST)" name="gst_state" options={INDIAN_STATES} />
                <Field label="PAN Number" name="pan" placeholder="XXXXX0000X" />
                <Field label="IEC Code" name="iec_code" placeholder="Import Export Code" />
                <Field label="CHA License No." name="cha_license" placeholder="CHA License Number" />
              </Section>
              <Section title="Tax Applicability">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">TDS Deductible</label>
                  <button
                    onClick={() => set('tds_applicable', !settings.tds_applicable)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.tds_applicable ? 'bg-brand-600' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.tds_applicable ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Advance Tax Applicable</label>
                  <button
                    onClick={() => set('advance_tax_applicable', !settings.advance_tax_applicable)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.advance_tax_applicable ? 'bg-brand-600' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.advance_tax_applicable ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </Section>
            </>
          )}

          {/* BANK TAB */}
          {activeTab === 'bank' && (
            <Section title="Primary Bank Account">
              <Field label="Bank Name" name="bank_name" placeholder="HDFC Bank" />
              <Field label="Branch" name="bank_branch" placeholder="Belapur Branch" />
              <Field label="Account Number" name="bank_account" placeholder="00000XXXXXXXXXX" />
              <Field label="IFSC Code" name="bank_ifsc" placeholder="HDFC0000000" />
            </Section>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <>
              <Section title="Channels">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">WhatsApp (WATI)</label>
                  <button
                    onClick={() => set('whatsapp_enabled', !settings.whatsapp_enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.whatsapp_enabled ? 'bg-green-600' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.whatsapp_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Email (Resend)</label>
                  <button
                    onClick={() => set('email_enabled', !settings.email_enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.email_enabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.email_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </Section>
              <Section title="Agent Alert Contacts">
                <Field label="MD WhatsApp (for Tesla/Aslesha alerts)" name="md_whatsapp" placeholder="919820XXXXXX" />
                <Field label="Accounts Email (for Pranali reports)" name="accounts_email" type="email" />
              </Section>
            </>
          )}

          {/* INVOICING TAB */}
          {activeTab === 'invoicing' && (
            <Section title="Document Numbering">
              <Field label="Invoice Prefix" name="invoice_prefix" placeholder="INV" />
              <Field label="Quote Prefix" name="quote_prefix" placeholder="QT" />
              <Field label="Job Prefix" name="job_prefix" placeholder="SC" />
              <Field label="Next Invoice Number" name="next_invoice_number" type="number" placeholder="1" />
            </Section>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">System Users</h3>
              </div>
              <div className="space-y-3">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-600/20 border border-brand-600/40 flex items-center justify-center text-brand-400 font-bold text-sm">
                        {u.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{u.full_name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      u.role === 'admin' ? 'bg-brand-600/20 text-brand-400' :
                      u.role === 'operator' ? 'bg-green-600/20 text-green-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>{u.role}</span>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-8">No users found</p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
