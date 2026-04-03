'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import type { AuthUser } from '@/types';

interface AuthContextValue {
  user:    AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user:    null,
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router  = useRouter();
  const supabase = getSupabaseClient();

  const loadUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setUser(null); return; }

      const { data: profile } = await supabase
        .from('users')
        .select('*, company:companies(*)')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUser({
          id:         profile.id,
          email:      profile.email,
          full_name:  profile.full_name,
          role:       profile.role,
          company_id: profile.company_id,
          company:    (profile as any).company,
        });
      }
    } catch (err) {
      console.error('[AuthProvider] loadUser error', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN')  loadUser();
      if (event === 'SIGNED_OUT') { setUser(null); router.push('/login'); }
    });

    return () => subscription.unsubscribe();
  }, [loadUser, router, supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refresh: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
