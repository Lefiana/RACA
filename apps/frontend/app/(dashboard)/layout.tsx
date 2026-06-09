// File: apps/frontend/app/(dashboard)/layout.tsx
// Purpose: Authenticated layout — sidebar + topbar shell
//          Redirects to /login if no session
// Dependencies: useSession, Sidebar, Navbar
'use client';

import { useEffect }      from 'react';
import { useRouter }      from 'next/navigation';
import { useSession }     from '../lib/auth/hooks';
import { Sidebar }        from '../../components/layout/sidebar';
import { Navbar }         from '../../components/layout/navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [session, isLoading, router]);

  if (isLoading) {
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