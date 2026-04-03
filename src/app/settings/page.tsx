'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Building2, Shield, Save, Plus, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/components/layout/AuthProvider';
import { Button, Card, CardHeader, Input, Badge } from '@/components/ui';
import { getSupabaseClient } from '@/lib/supabase';
import { getInitials } from '@/lib/utils';

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [tab, setTab] = useState<'company' | 'users'>('company');
  const [saving, setSaving] = useState(false);
  const [users, setUsers]   = useState<any[]>([]);
  const [companyForm, setCompanyForm] = useState({
    name: '', address: '', city: '', country: '', phone: '', email: '', gst_number: '',
  });

  useEffect(() => {
    if (user?.company) {
      setCompanyForm({
        name:       user.company.name        || '',
        address:    user.company.address     || '',
        city:       user.company.city        || '',
        country:    user.company.country     || '',
        phone:      user.company.phone       || '',
        email:      user.company.email       || '',
        gst_number: user.company.gst_number  || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (tab === 'users' && user?.company_id) {
      const supabase = getSupabaseClient();
      supabase.from('users').select('*').eq('company_id', user.company_id)
        .then(({ data }) => setUsers(data || []));
    }
  }, [tab, user]);

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('companies')
        .update(companyForm)
        .eq('id', user!.company_id);
      if (error) throw error;
      await refresh();
      toast.success('Company settings saved');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const cf = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCompanyForm(p => ({ ...p, [k]: e.target.value }));

  const ROLE_COLORS: Record<string, string> = {
    admin:    'text-brand-600 bg-brand-50',
    operator: 'text-emerald-600 bg-emerald-50',
    viewer:   'text-slate-500 bg-slate-100',
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <h2 className="text-xl font-display font-bold text-slate-900">Settings</h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { key: 'company', label: 'Company', icon: Building2 },
          { key: 'users', label: 'Users', icon: UserIcon },
        ].map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Company Tab */}
      {tab === 'company' && (
        <Card>
          <CardHeader title="Company Profile" subtitle="This information appears on all your documents" />
          <form onSubmit={saveCompany} className="p-5 space-y-4">
            <Input label="Company Name" value={companyForm.name} onChange={cf('name')} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Phone" value={companyForm.phone} onChange={cf('phone')} placeholder="+91 22 xxxx xxxx" />
              <Input label="Email" type="email" value={companyForm.email} onChange={cf('email')} placeholder="info@company.com" />
            </div>
            <Input label="Address" value={companyForm.address} onChange={cf('address')} placeholder="Full office address" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="City" value={companyForm.city} onChange={cf('city')} placeholder="Mumbai" />
              <Input label="Country" value={companyForm.country} onChange={cf('country')} placeholder="India" />
            </div>
            <Input label="GST Number" value={companyForm.gst_number} onChange={cf('gst_number')} placeholder="27AAAAA0000A1Z5" />
            <div className="flex justify-end pt-2">
              <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>Save Settings</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <Card>
          <CardHeader
            title="Team Members"
            subtitle="Users in your workspace"
            action={
              user?.role === 'admin' && (
                <Button size="sm" variant="outline" icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => toast('User invite coming soon!')}>
                  Invite User
                </Button>
              )
            }
          />
          <div className="divide-y divide-slate-100">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-bold flex-shrink-0">
                  {getInitials(u.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm">{u.full_name}
                    {u.id === user?.id && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                  </div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </div>
                <Badge className={ROLE_COLORS[u.role]}>{u.role}</Badge>
                {!u.is_active && <Badge color="text-red-500" bg="bg-red-50">Inactive</Badge>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Plan info */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 capitalize">{user?.company?.plan || 'starter'} Plan</div>
              <div className="text-xs text-slate-500">ShipCore ERP</div>
            </div>
          </div>
          <Button variant="outline" size="sm">Upgrade</Button>
        </div>
      </Card>
    </div>
  );
}
