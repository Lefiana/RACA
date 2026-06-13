// File: apps/frontend/app/(dashboard)/approvals/[stepId]/page.tsx
// Purpose: Dedicated approver view — request context + decision form
//          Only accessible to the assigned approver for this step
// Dependencies: useApprovalStep, useApproveStep, useRejectStep
'use client';

import { useState }             from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link                     from 'next/link';
import { useApprovalStep }      from '../../../lib/approvals/hooks';
import { useApproveStep }       from '../../../lib/approvals/hooks';
import { useRejectStep }        from '../../../lib/approvals/hooks';

const STAGE_LABELS: Record<string, string> = {
  STAGE_1_ADVISER:                 'Adviser Review',
  STAGE_1_DEPT_HEAD:               'Department Head Review',
  STAGE_2_MIS:                     'MIS Review',
  STAGE_2_BUILDING:                'Building Administrator Review',
  STAGE_2_HEAD_OF_STUDENT_AFFAIRS: 'Head of Student Affairs Review',
  STAGE_2_ACADEMIC_HEAD:           'Academic Head Review',
  STAGE_3_SCHOOL_ADMIN:            'School Administrator Review',
};

// CHANGED: Helper — returns true only when the request's current status
// matches the stage that this step belongs to. Prevents acting out of turn.
function isStepActionable(
  stage: string,
  requestStatus: string,
): boolean {
  switch (stage) {
    case 'STAGE_1_ADVISER':
      return requestStatus === 'PENDING';

    case 'STAGE_1_DEPT_HEAD':
      return requestStatus === 'STAGE1_REVIEW';

    case 'STAGE_2_MIS':
    case 'STAGE_2_BUILDING':
    case 'STAGE_2_ACADEMIC_HEAD':
    case 'STAGE_2_HEAD_OF_STUDENT_AFFAIRS':
      return requestStatus === 'STAGE2_REVIEW';

    case 'STAGE_3_SCHOOL_ADMIN':
      return requestStatus === 'PENDING_FINAL';

    default:
      return false;
  }
}

export default function ApprovalStepPage() {
  const { stepId } = useParams<{ stepId: string }>();
  const router     = useRouter();

  const { data: step, isLoading, isError, refetch } = useApprovalStep(stepId);
  const approveStep = useApproveStep();
  const rejectStep  = useRejectStep();

  const [remarks, setRemarks]                 = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [mode, setMode]                       = useState<'view' | 'approve' | 'reject'>('view');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isError || !step) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-2">
          <p className="text-sm text-destructive">
            Step not found or you are not authorized to view it.
          </p>
          <Link href="/approvals" className="text-sm text-primary hover:underline">
            ← Back to Approvals
          </Link>
        </div>
      </div>
    );
  }

  const request   = step.request;
  const isDecided  = step.status !== 'PENDING';

  // CHANGED: Derive whether this user can act right now.
  // Both conditions must be true:
  //   1. The step itself is still PENDING (not already decided)
  //   2. The request is in the correct status for this stage (it's this step's turn)
  const canAct =
    step?.status === 'PENDING' &&
    isStepActionable(step?.stage ?? '', request?.status ?? '');

  // CHANGED: Reason string shown when buttons are disabled — helps the approver
  // understand why they can't act yet without guessing.
  const notYetTurnReason =
    step?.status === 'PENDING' && !canAct
      ? 'This step is not yet actionable — a prior stage must be completed first.'
      : null;

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAct) return;
    await approveStep.mutateAsync({
      stepId: step.id,
      dto:    { remarks: remarks || undefined },
    });
    router.push('/approvals');
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAct) return;
    await rejectStep.mutateAsync({
      stepId: step.id,
      dto:    { remarks: remarks || undefined, rejectionReason },
    });
    router.push('/approvals');
  };

  const isSubmitting = approveStep.isPending || rejectStep.isPending;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/approvals" className="text-sm text-muted-foreground hover:text-foreground">
          ← Approvals
        </Link>
        <h1 className="text-2xl font-semibold text-foreground mt-2">
          {STAGE_LABELS[step.stage] ?? step.stage.replace(/_/g, ' ')}
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="font-mono text-xs text-muted-foreground">
            {request?.referenceNumber}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            step.status === 'PENDING'  ? 'bg-yellow-100 text-yellow-800' :
            step.status === 'APPROVED' ? 'bg-green-100 text-green-800'  :
            step.status === 'REJECTED' ? 'bg-red-100 text-red-800'      :
            'bg-muted text-muted-foreground'
          }`}>
            {step.status}
          </span>
        </div>
      </div>

      {/* Request summary */}
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        <div className="p-6 space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            {request?.activityTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            Requested by {request?.requestedBy?.name}
            {request?.requestedBy?.email && ` · ${request.requestedBy.email}`}
          </p>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Start</p>
            <p className="font-medium text-foreground mt-1">
              {request?.activityStartAt
                ? new Date(request.activityStartAt).toLocaleString()
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">End</p>
            <p className="font-medium text-foreground mt-1">
              {request?.activityEndAt
                ? new Date(request.activityEndAt).toLocaleString()
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Already decided */}
      {isDecided && (
        <div className={`p-4 rounded-lg border ${
          step.status === 'APPROVED'
            ? 'bg-green-50 border-green-200'
            : step.status === 'REJECTED'
            ? 'bg-red-50 border-red-200'
            : 'bg-muted border-border'
        }`}>
          <p className="text-sm font-medium text-foreground">
            This step has already been {step.status.toLowerCase()}.
          </p>
          {step.decidedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(step.decidedAt).toLocaleString()}
            </p>
          )}
          {step.remarks && (
            <p className="text-sm text-foreground mt-2 italic">"{step.remarks}"</p>
          )}
          {step.rejectionReason && (
            <p className="text-sm text-destructive mt-2">
              Reason: {step.rejectionReason}
            </p>
          )}
        </div>
      )}

      {/* Decision form — only if still pending */}
      {!isDecided && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Your Decision</h2>

          {/* CHANGED: Show a clear contextual message when step is disabled */}
          {notYetTurnReason && (
            <p className="text-sm text-muted-foreground mb-4 italic">
              {notYetTurnReason}
            </p>
          )}

          {/* Mode selector */}
          {mode === 'view' && (
            <div className="flex gap-3">
              <button
                onClick={() => setMode('approve')}
                disabled={!canAct}
                className="flex-1 py-2.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-40 disabled:hover:bg-green-600 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => setMode('reject')}
                disabled={!canAct}
                className="flex-1 py-2.5 text-sm font-medium border border-destructive/50 text-destructive rounded-md hover:bg-destructive/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                Reject
              </button>
            </div>
          )}

          {/* Approve form */}
          {mode === 'approve' && (
            <form onSubmit={handleApprove} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Remarks <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  rows={3}
                  placeholder="Add any notes for the requestor..."
                  className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {approveStep.isError && (
                <p className="text-sm text-destructive">
                  {(approveStep.error as any)?.response?.data?.message ?? 'Failed to approve.'}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  disabled={isSubmitting}
                  className="flex-1 py-2 text-sm border border-input rounded-md hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !canAct}
                  className="flex-1 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </form>
          )}

          {/* Reject form */}
          {mode === 'reject' && (
            <form onSubmit={handleReject} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Rejection Reason <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  rows={3}
                  required
                  minLength={10}
                  placeholder="Explain why this request is being rejected (min 10 characters)..."
                  className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Remarks <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  rows={2}
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {rejectStep.isError && (
                <p className="text-sm text-destructive">
                  {(rejectStep.error as any)?.response?.data?.message ?? 'Failed to reject.'}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  disabled={isSubmitting}
                  className="flex-1 py-2 text-sm border border-input rounded-md hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || rejectionReason.length < 10 || !canAct}
                  className="flex-1 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}