'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import type { AuthUser } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const loadUser = useCallback(async () => {
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setUser(null);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, email, full_name, role, company_id, company:companies(*)')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        console.error('[AuthProvider] profile error', profileError);
        setUser(null);
        return;
      }

      const company = Array.isArray(profile.company) ? profile.company[0] : profile.company;
      setUser({ ...profile, company } as AuthUser);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void loadUser();
    });

    return () => listener.subscription.unsubscribe();
  }, [loadUser, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.replace('/login');
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut: handleSignOut, refresh: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
