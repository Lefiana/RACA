// File: apps/frontend/app/(dashboard)/users/page.tsx
// Purpose: User management — list, search, filter by role, and create user
// Dependencies: useUsers, useCurrentUser, useCreateUser
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUsers, useCreateUser } from '../../lib/users/hooks';
import { useCurrentUser } from '../../lib/auth/hooks';
import type { UserRole, ICreateUserDto } from '../../lib/users/types';

const ROLES: UserRole[] = [
  'REQUESTOR', 'ADVISER', 'DEPARTMENT_HEAD', 'MIS',
  'BUILDING_ADMIN', 'HRM_CUSTODIAN', 'STUDENT_AFFAIRS',
  'ACADEMIC_HEAD', 'SCHOOL_ADMIN', 'SUPER_ADMIN',
];

const ROLE_COLORS: Record<UserRole, string> = {
  REQUESTOR:       'bg-muted text-muted-foreground',
  ADVISER:         'bg-blue-100 text-blue-800',
  DEPARTMENT_HEAD: 'bg-blue-100 text-blue-800',
  MIS:             'bg-purple-100 text-purple-800',
  BUILDING_ADMIN:  'bg-purple-100 text-purple-800',
  HRM_CUSTODIAN:   'bg-purple-100 text-purple-800',
  STUDENT_AFFAIRS: 'bg-yellow-100 text-yellow-800',
  ACADEMIC_HEAD:   'bg-yellow-100 text-yellow-800',
  SCHOOL_ADMIN:    'bg-green-100 text-green-800',
  SUPER_ADMIN:     'bg-red-100 text-red-800',
};

export default function UsersPage() {
  const { user: currentUser }   = useCurrentUser();
  const [page, setPage]         = useState(1);
  const [role, setRole]         = useState<UserRole | undefined>();
  const [search, setSearch]     = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showCreate, setShowCreate]   = useState(false);

  const { data, isLoading, isError } = useUsers({ page, limit: 20, role, search: search || undefined });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage user accounts and role assignments
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
          >
            Create User
          </button>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} />
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by name or email..."
            className="px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64"
          />
          <button
            type="submit"
            className="px-3 py-2 text-sm border border-input rounded-md bg-background hover:bg-muted transition-colors"
          >
            Search
          </button>
        </form>

        <select
          value={role ?? ''}
          onChange={e => { setRole(e.target.value as UserRole || undefined); setPage(1); }}
          className="px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Roles</option>
          {ROLES.map(r => (
            <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading users...</div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-destructive">Failed to load users.</div>
        ) : !data?.data?.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.data.map(u => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                      {u.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.department ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      u.isActive ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
                    }`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/users/${u.id}`}
                      className="text-primary hover:underline text-xs"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, data.meta.total)} of {data.meta.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={!data.meta.hasPrevPage}
              className="px-3 py-1 border border-input rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!data.meta.hasNextPage}
              className="px-3 py-1 border border-input rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const createUser = useCreateUser();
  const [form, setForm] = useState<ICreateUserDto>({
    name:       '',
    email:      '',
    password:   '',
    username:   '',
    department: '',
    role:       'REQUESTOR',
  });

  const set = (field: keyof ICreateUserDto) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createUser.mutateAsync(form);
    onClose();
  };

  const error = createUser.error as any;
  const errorMessage = error?.response?.data?.message
    ?? error?.message
    ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Create User</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Creates a local account. For Microsoft 365 accounts, users sign in via SSO.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Full Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              required
              placeholder="Juan dela Cruz"
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {/* Email */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Email <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              required
              placeholder="juan@sti-cubao.edu.ph"
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {/* Password */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Password <span className="text-destructive">*</span>
            </label>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              required
              minLength={8}
              placeholder="Min 8 characters"
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {/* Username + Department side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Username</label>
              <input
                type="text"
                value={form.username ?? ''}
                onChange={set('username')}
                placeholder="juandc"
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Department</label>
              <input
                type="text"
                value={form.department ?? ''}
                onChange={set('department')}
                placeholder="BSIT"
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          {/* Role */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Role <span className="text-destructive">*</span>
            </label>
            <select
              value={form.role}
              onChange={set('role')}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Role can be changed later from the user detail page.
            </p>
          </div>
          {/* Error */}
          {errorMessage && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                {Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage}
              </p>
            </div>
          )}
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={createUser.isPending}
              className="flex-1 py-2 text-sm border border-input rounded-md bg-background hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createUser.isPending}
              className="flex-1 py-2 text-sm bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createUser.isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}