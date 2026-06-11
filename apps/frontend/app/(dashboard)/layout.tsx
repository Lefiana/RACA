// File: apps/frontend/app/(dashboard)/layout.tsx
// CHANGED: added retry delay before redirecting to avoid race condition
//          on first login where cookie isn't immediately readable
'use client';

import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import { useSession }          from '../lib/auth/hooks';
import { Sidebar }             from '../../components/layout/sidebar';
import { Navbar }              from '../../components/layout/navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isLoading } = useSession();
  const router = useRouter();
  // CHANGED: track if we've waited long enough to be sure there's no session
  const [readyToRedirect, setReadyToRedirect] = useState(false);

  useEffect(() => {
    if (!isLoading && !session) {
      // CHANGED: wait 500ms before redirecting — gives the cookie time
      // to be readable after a fresh login redirect
      const timer = setTimeout(() => setReadyToRedirect(true), 500);
      return () => clearTimeout(timer);
    }
    if (session) {
      setReadyToRedirect(false);
    }
  }, [session, isLoading]);

  useEffect(() => {
    if (readyToRedirect && !session && !isLoading) {
      router.push('/login');
    }
  }, [readyToRedirect, session, isLoading, router]);

  if (isLoading || (!session && !readyToRedirect)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar user={session.user} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}