// File: apps/frontend/components/layout/navbar.tsx
// Purpose: Top navigation bar with user menu and sign out
// Dependencies: useSignOut, IUser
'use client';

import { useSignOut }  from 'app/lib/auth/hooks';
import type { IUser }  from 'app/lib/auth/types';

interface NavbarProps {
  user: IUser;
}

export function Navbar({ user }: NavbarProps) {
  const signOut = useSignOut();

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{user.email}</span>
        <button
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {signOut.isPending ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </header>
  );
}