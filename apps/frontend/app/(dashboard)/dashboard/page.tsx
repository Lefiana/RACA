// File: apps/frontend/app/(dashboard)/dashboard/page.tsx
// Purpose: Dashboard home — shows role-based summary
'use client';

import { useCurrentUser } from '../../lib/auth/hooks';

export default function DashboardPage() {
  const { user } = useCurrentUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome back, {user?.name}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {user?.role} · {user?.department ?? 'No department set'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground">Role</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{user?.role}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground">Department</p>
          <p className="text-2xl font-semibold text-foreground mt-1">
            {user?.department ?? '—'}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="text-2xl font-semibold text-foreground mt-1">
            {user?.isActive ? 'Active' : 'Inactive'}
          </p>
        </div>
      </div>
    </div>
  );
}