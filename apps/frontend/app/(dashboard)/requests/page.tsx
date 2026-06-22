// File: apps/frontend/app/(dashboard)/requests/page.tsx
// CHANGED: fixed viewMode param, added REVISION_REQUESTED status, added aria-label to select

'use client';

import { useState }       from 'react';
import Link               from 'next/link';
import { useRequests }    from '../../lib/requests/hooks';
import { useCurrentUser } from '../../lib/auth/hooks';
import type { RequestStatus } from '../../lib/requests/types';

const APPROVER_ROLES = new Set([
  'ADVISER', 'DEPARTMENT_HEAD', 'MIS', 'BUILDING_ADMIN',
  'STUDENT_AFFAIRS', 'ACADEMIC_HEAD', 'SCHOOL_ADMIN',
]);

const STATUS_LABELS: Record<RequestStatus, string> = {
  DRAFT:              'Draft',
  PENDING:            'Pending',
  STAGE1_REVIEW:      'Stage 1 Review',
  STAGE2_REVIEW:      'Stage 2 Review',
  PENDING_FINAL:      'Pending Final',
  APPROVED:           'Approved',
  REJECTED:           'Rejected',
  CANCELLED:          'Cancelled',
  COMPLETED:          'Completed',
  REVISION_REQUESTED: 'Revision Requested',  // ← ADDED
};

const STATUS_COLORS: Record<RequestStatus, string> = {
  DRAFT:              'bg-muted text-muted-foreground',
  PENDING:            'bg-yellow-100 text-yellow-800',
  STAGE1_REVIEW:      'bg-blue-100 text-blue-800',
  STAGE2_REVIEW:      'bg-blue-100 text-blue-800',
  PENDING_FINAL:      'bg-purple-100 text-purple-800',
  APPROVED:           'bg-green-100 text-green-800',
  REJECTED:           'bg-red-100 text-red-800',
  CANCELLED:          'bg-muted text-muted-foreground',
  COMPLETED:          'bg-green-100 text-green-800',
  REVISION_REQUESTED: 'bg-orange-100 text-orange-800',  // ← ADDED
};

export default function RequestsPage() {
  const { user }                      = useCurrentUser();
  const [page, setPage]               = useState(1);
  const [status, setStatus]           = useState<RequestStatus | undefined>();
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  // CHANGED: view toggle — 'mine' or 'assigned'
  const [view, setView]               = useState<'mine' | 'assigned'>('mine');

  const isApprover  = APPROVER_ROLES.has(user?.role ?? '');
  const isAdmin     = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN';

  // FIXED: use viewMode with correct backend values
  const { data, isLoading, isError } = useRequests({
    page,
    limit:  20,
    status,
    search: search || undefined,
    viewMode: isApprover && view === 'assigned' ? 'for_my_review' : 'my_requests',
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage campus activity requests
          </p>
        </div>
        <Link
          href="/requests/new"
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
        >
          New Request
        </Link>
      </div>

      {/* CHANGED: view toggle for approver roles */}
      {isApprover && (
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => { setView('mine'); setPage(1); }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              view === 'mine'
                ? 'bg-card text-foreground shadow-sm font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            My Requests
          </button>
          <button
            onClick={() => { setView('assigned'); setPage(1); }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              view === 'assigned'
                ? 'bg-card text-foreground shadow-sm font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            For My Review
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by title or reference..."
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
          value={status ?? ''}
          onChange={e => { setStatus(e.target.value as RequestStatus || undefined); setPage(1); }}
          aria-label="Filter by status"  // ← ADDED: fixes accessibility warning
          className="px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading requests...
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-destructive">
            Failed to load requests.
          </div>
        ) : !data?.data?.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {view === 'assigned'
              ? 'No requests assigned to you for review.'
              : 'No requests found.'}
            {view === 'mine' && (
              <span> <Link href="/requests/new" className="text-primary hover:underline">Create your first request.</Link></span>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                {(view === 'assigned' || isAdmin) && (
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Requestor</th>
                )}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.data.map(req => (
                <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {req.referenceNumber}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">
                    {req.activityTitle}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                      {STATUS_LABELS[req.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(req.activityStartAt).toLocaleDateString()}
                  </td>
                  {(view === 'assigned' || isAdmin) && (
                    <td className="px-4 py-3 text-muted-foreground">
                      {req.requestedBy?.name ?? '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/requests/${req.id}`}
                      className="text-primary hover:underline text-xs"
                    >
                      View
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