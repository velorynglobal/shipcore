'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Anchor, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

interface LoginFormProps {
  redirectTo: string;
  configurationError?: boolean;
}

export default function LoginForm({ redirectTo, configurationError = false }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;

      toast.success('Signed in');
      router.replace(redirectTo);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-shell-900 bg-grid-pattern flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-white text-xl">ShipCore</div>
            <div className="text-[10px] text-slate-500 font-mono tracking-widest">LOGISTICS ERP</div>
          </div>
        </div>

        <section className="bg-white rounded-lg shadow-2xl p-8">
          <h1 className="text-2xl font-display font-bold text-slate-900">Welcome back</h1>
          <p className="text-slate-500 text-sm mt-1 mb-7">Sign in to your company workspace</p>

          {configurationError && (
            <div className="mb-5 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 rounded-md">
              Authentication is not configured. Contact your administrator.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-slate-700 block mb-1">Work email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full h-10 px-3 pr-10 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || configurationError}
              className="w-full h-10 bg-brand-600 hover:bg-brand-700 text-white rounded-md text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Sign in
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            New to ShipCore?{' '}
            <Link href="/register" className="text-brand-600 hover:text-brand-700 font-semibold">Create an account</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
