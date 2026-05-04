'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Install next-auth if not already installed
// npm install next-auth@latest

export default function LoginPage() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: new URLSearchParams(window.location.search).get('redirectTo') || '/',
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push(result?.url || '/');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 400,
      margin: '100px auto',
      padding: 40,
      background: 'white',
      borderRadius: 12,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    }}>
      <h1 style={{ fontSize: 24, marginBottom: 24, textAlign: 'center' }}>Login</h1>
      
      {error && (
        <div style={{
          padding: 12,
          background: '#fee2e2',
          color: '#991b1b',
          borderRadius: 6,
          marginBottom: 20,
          textAlign: 'center',
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="redirectTo" value="/" />
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Email</label>
          <input
            type="email"
            name="email"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14,
            }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Password</label>
          <input
            type="password"
            name="password"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14,
            }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: '#1e40af',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
