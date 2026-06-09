// File: apps/frontend/app/(auth)/login/page.tsx
// Purpose: Login form — uses useSignIn hook, redirects to /dashboard on success
// Dependencies: useSignIn, react-hook-form
'use client';

import { useState }    from 'react';
import { useSignIn }   from '../../lib/auth/hooks';
import Link            from 'next/link';

export default function LoginPage() {
  const signIn  = useSignIn();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signIn.mutate({ email, password });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-foreground">RACA Platform</h1>
        <p className="text-sm text-muted-foreground mt-1">
          STI Academic Center Cubao
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@sti-cubao.edu.ph"
            required
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Error */}
        {signIn.isError && (
          <p className="text-sm text-destructive">
            Invalid email or password. Please try again.
          </p>
        )}

        <button
          type="submit"
          disabled={signIn.isPending}
          className="w-full py-2 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {signIn.isPending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {/* Footer */}
      <p className="text-xs text-muted-foreground text-center mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}