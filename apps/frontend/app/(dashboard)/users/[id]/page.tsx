// File: apps/frontend/app/(dashboard)/users/[id]/page.tsx
// Purpose: User detail — view profile, change role, toggle active, delete
// Dependencies: useUser, useUpdateUserRole, useToggleUserActive, useDeleteUser
'use client';

import { useState }             from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link                     from 'next/link';
import {
  useUser,
  useUpdateUserRole,
  useToggleUserActive,
  useDeleteUser,
} from '../../../lib/users/hooks';
import { useCurrentUser }       from '../../../lib/auth/hooks';
import type { UserRole }        from '../../../lib/users/types';

const ROLES: UserRole[] = [
  'REQUESTOR', 'ADVISER', 'DEPARTMENT_HEAD', 'MIS',
  'BUILDING_ADMIN', 'HRM_CUSTODIAN', 'STUDENT_AFFAIRS',
  'ACADEMIC_HEAD', 'SCHOOL_ADMIN', 'SUPER_ADMIN',
];

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  REQUESTOR:       'Can create and submit activity requests',
  ADVISER:         'Stage 1 approver — first reviewer in the chain',
  DEPARTMENT_HEAD: 'Stage 1 approver — second reviewer after Adviser',
  MIS:             'Stage 2 parallel approver — manages tech assets',
  BUILDING_ADMIN:  'Stage 2 parallel approver — manages venues and building assets',
  HRM_CUSTODIAN:   'Stage 2 asset custodian — manages HRM equipment',
  STUDENT_AFFAIRS: 'Stage 2 parallel approver — Head of Student Affairs',
  ACADEMIC_HEAD:   'Stage 2 parallel approver — Academic Head',
  SCHOOL_ADMIN:    'Stage 3 final approver — School Administrator',
  SUPER_ADMIN:     'Full system access — can manage all users and settings',
};

export default function UserDetailPage() {
  const { id }            = useParams<{ id: string }>();
  const router            = useRouter();
  const { user: current } = useCurrentUser();

  const { data: user, isLoading, isError, refetch } = useUser(id);
  const updateRole    = useUpdateUserRole();
  const toggleActive  = useToggleUserActive();
  const deleteUser    = useDeleteUser();

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showDelete, setShowDelete]     = useState(false);

  const isSuperAdmin  = current?.role === 'SUPER_ADMIN';
  const isSelf        = current?.id === id;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading user...</p>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-destructive">User not found.</p>
      </div>
    );
  }

  const activeRole = selectedRole ?? user.role;

  const handleRoleChange = async () => {
    if (!selectedRole || selectedRole === user.role) return;
    await updateRole.mutateAsync({ id, dto: { role: selectedRole } });
    refetch();
    setSelectedRole(null);
  };

  const handleToggleActive = async () => {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    await toggleActive.mutateAsync(id);
    refetch();
  };

  const handleDelete = async () => {
    await deleteUser.mutateAsync(id);
    router.push('/users');
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/users" className="text-sm text-muted-foreground hover:text-foreground">
          ← Users
        </Link>
        <h1 className="text-2xl font-semibold text-foreground mt-2">{user.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
      </div>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        <div className="p-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Username</p>
            <p className="font-medium text-foreground mt-1">{user.username ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Department</p>
            <p className="font-medium text-foreground mt-1">{user.department ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
              user.isActive ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
            }`}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <p className="text-muted-foreground">Last Login</p>
            <p className="font-medium text-foreground mt-1">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Member Since</p>
            <p className="font-medium text-foreground mt-1">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Role assignment — SUPER_ADMIN only, can't change own role */}
        {isSuperAdmin && !isSelf && (
          <div className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Role Assignment</h2>

            <div className="space-y-3">
              {ROLES.map(r => (
                <label
                  key={r}
                  className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                    activeRole === r
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={activeRole === r}
                    onChange={() => setSelectedRole(r)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {r.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ROLE_DESCRIPTIONS[r]}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {selectedRole && selectedRole !== user.role && (
              <div className="flex items-center gap-3 pt-2">
                <p className="text-sm text-muted-foreground flex-1">
                  Change role from{' '}
                  <span className="font-medium text-foreground">{user.role.replace(/_/g, ' ')}</span>
                  {' '}to{' '}
                  <span className="font-medium text-foreground">{selectedRole.replace(/_/g, ' ')}</span>
                </p>
                <button
                  onClick={() => setSelectedRole(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </button>
                <button
                  onClick={handleRoleChange}
                  disabled={updateRole.isPending}
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {updateRole.isPending ? 'Saving...' : 'Save Role'}
                </button>
              </div>
            )}

            {updateRole.isSuccess && (
              <p className="text-sm text-green-600">Role updated successfully.</p>
            )}
          </div>
        )}
      </div>

      {/* Danger zone — SUPER_ADMIN only, can't act on self */}
      {isSuperAdmin && !isSelf && (
        <div className="bg-card border border-destructive/30 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {user.isActive ? 'Deactivate Account' : 'Activate Account'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {user.isActive
                  ? 'Prevents the user from logging in without deleting their data.'
                  : 'Restores the user\'s ability to log in.'}
              </p>
            </div>
            <button
              onClick={handleToggleActive}
              disabled={toggleActive.isPending}
              className={`px-3 py-2 text-sm rounded-md disabled:opacity-50 transition-colors ${
                user.isActive
                  ? 'border border-destructive/50 text-destructive hover:bg-destructive/10'
                  : 'border border-green-500/50 text-green-700 hover:bg-green-50'
              }`}
            >
              {toggleActive.isPending
                ? 'Updating...'
                : user.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Delete Account</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Soft-deletes the account. Audit logs and request history are preserved.
              </p>
            </div>
            {!showDelete ? (
              <button
                onClick={() => setShowDelete(true)}
                className="px-3 py-2 text-sm border border-destructive/50 text-destructive rounded-md hover:bg-destructive/10 transition-colors"
              >
                Delete
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDelete(false)}
                  className="px-3 py-2 text-sm border border-input rounded-md hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteUser.isPending}
                  className="px-3 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                >
                  {deleteUser.isPending ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}