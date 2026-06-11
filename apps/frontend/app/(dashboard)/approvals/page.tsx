// File: apps/frontend/app/(dashboard)/approvals/page.tsx
// Purpose: Pending approval queue for the current approver role
// Dependencies: usePendingApprovals, useCurrentUser
'use client';

import { useState }             from 'react';
import Link                     from 'next/link';
import { usePendingApprovals }  from '../../lib/approvals/hooks';
import { useCurrentUser }       from '../../lib/auth/hooks';

const STAGE_LABELS: Record<string, string> = {
  STAGE_1_ADVISER:                'Adviser Review',
  STAGE_1_DEPT_HEAD:              'Department Head Review',
  STAGE_2_MIS:                    'MIS Review',
  STAGE_2_BUILDING:               'Building Administrator Review',
  STAGE_2_HEAD_OF_STUDENT_AFFAIRS: 'Head of Student Affairs Review',
  STAGE_2_ACADEMIC_HEAD:          'Academic Head Review',
  STAGE_3_SCHOOL_ADMIN:           'School Administrator Review',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:  'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  SKIPPED:  'bg-muted text-muted-foreground',
};

export default function ApprovalsPage() {
  const { user }  = useCurrentUser();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = usePendingApprovals({ page, limit: 20 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Requests pending your review as {user?.role?.replace(/_/g, ' ')}
        </p>
      </div>

      {/* List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading pending approvals...
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-destructive">
            Failed to load approvals.
          </div>
        ) : !data?.data?.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No pending approvals. You're all caught up.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Activity</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stage</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Requestor</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.data.map(step => (
                <tr key={step.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {step.request?.referenceNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">
                    {step.request?.activityTitle ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {STAGE_LABELS[step.stage] ?? step.stage}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {step.request?.requestedBy?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {step.request?.activityStartAt
                      ? new Date(step.request.activityStartAt).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[step.status]}`}>
                      {step.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {/* CHANGED: Review link now goes directly to the dedicated step evaluation page */}
                    <Link
                      href={`/approvals/${step.id}`}
                      className="text-primary hover:underline text-xs font-medium"
                    >
                      Review
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