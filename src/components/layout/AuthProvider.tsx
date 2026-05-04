'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
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
  const { data: session, status } = useSession();
  const router  = useRouter();

  const loadUser = useCallback(async () => {
    try {
      if (!session?.user) { setUser(null); return; }
      const sessionUser = session.user as { id?: string; email?: string; name?: string };

      // Simple user object for test auth
      setUser({
        id:         sessionUser.id || sessionUser.email || 'session-user',
        email:      sessionUser.email || '',
        full_name:  sessionUser.name || '',
        role:       'viewer',
        company_id: null,
        company:    null,
      });
    } catch (err) {
      console.error('[AuthProvider] loadUser error', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (status === 'loading') return;
    loadUser();
  }, [loadUser, status]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
    setUser(null);
    router.push('/login');
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
