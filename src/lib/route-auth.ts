import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

type UserRole = 'admin' | 'operator' | 'viewer';

type RouteProfile = {
  company_id: string;
  role: UserRole;
};

type RouteAccessSuccess = {
  errorResponse: null;
  profile: RouteProfile;
  supabase: ReturnType<typeof createServerSupabaseClient>;
  user: { id: string };
};

type RouteAccessFailure = {
  errorResponse: NextResponse;
  profile?: never;
  supabase?: never;
  user?: never;
};

type RouteAccess = RouteAccessSuccess | RouteAccessFailure;

type AccessOptions = {
  minimumRole?: 'operator' | 'admin';
};

export async function requireRouteAccess(options: AccessOptions = {}): Promise<RouteAccess> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return {
      errorResponse: NextResponse.json({ error: 'Profile not found' }, { status: 404 }),
    };
  }

  if (options.minimumRole === 'admin' && profile.role !== 'admin') {
    return {
      errorResponse: NextResponse.json({ error: 'Admin only' }, { status: 403 }),
    };
  }

  if (options.minimumRole === 'operator' && profile.role === 'viewer') {
    return {
      errorResponse: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }),
    };
  }

  return {
    errorResponse: null,
    profile,
    supabase,
    user: { id: user.id },
  };
}
