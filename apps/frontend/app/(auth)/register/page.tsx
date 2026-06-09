// File: apps/frontend/app/(auth)/register/page.tsx
// Purpose: Registration form
'use client';

import { useState }   from 'react';
import { useSignUp }  from '../../lib/auth/hooks';
import Link           from 'next/link';

export default function RegisterPage() {
  const signUp = useSignUp();
  const [form, setForm] = useState({
    name: '', email: '', password: '', username: '', department: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signUp.mutate(form);
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Create Account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          RACA Platform — STI Academic Center Cubao
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { id: 'name',       label: 'Full Name',   type: 'text',     placeholder: 'Juan dela Cruz',           required: true  },
          { id: 'email',      label: 'Email',        type: 'email',    placeholder: 'you@sti-cubao.edu.ph',     required: true  },
          { id: 'password',   label: 'Password',     type: 'password', placeholder: '••••••••',                 required: true  },
          { id: 'username',   label: 'Username',     type: 'text',     placeholder: 'juandc',                   required: false },
          { id: 'department', label: 'Department',   type: 'text',     placeholder: 'BSIT',                     required: false },
        ].map(field => (
          <div key={field.id} className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor={field.id}>
              {field.label}
            </label>
            <input
              id={field.id}
              type={field.type}
              value={form[field.id as keyof typeof form]}
              onChange={set(field.id)}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ))}

        {signUp.isError && (
          <p className="text-sm text-destructive">
            Registration failed. Please try again.
          </p>
        )}

        <button
          type="submit"
          disabled={signUp.isPending}
          className="w-full py-2 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {signUp.isPending ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-xs text-muted-foreground text-center mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}