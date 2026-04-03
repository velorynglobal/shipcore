/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { email, password, full_name, company_name } = await request.json();
    if (!email || !password || !full_name || !company_name) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

    const admin = createAdminClient();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    const { data: company, error: companyError } = await admin.from('companies').insert({ name: company_name, country: 'India' }).select().single();
    if (companyError) { await admin.auth.admin.deleteUser(authData.user.id); return NextResponse.json({ error: 'Failed to create company' }, { status: 500 }); }

    const { data: userProfile, error: profileError } = await admin.from('users').insert({
      id: authData.user.id, company_id: company.id, full_name, email, role: 'admin',
    }).select().single();
    if (profileError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      await admin.from('companies').delete().eq('id', company.id);
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
    }

    return NextResponse.json({ data: { user: userProfile, company }, message: 'Account created successfully.', error: null }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
