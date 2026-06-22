// File: apps/frontend/app/(dashboard)/approvals/decide-modal.tsx
// Purpose: Reusable approve/reject/revision modal
// Dependencies: useApproveStep, useRejectStep, useRequestRevision, IApprovalStep
'use client';

import { useState } from 'react';
import { useApproveStep, useRejectStep, useRequestRevision } from '../../lib/approvals/hooks';
import type { IApprovalStep, RevisionType } from '../../lib/approvals/types';

type DecideMode = 'approve' | 'reject' | 'revision_resume' | 'revision_restart';

interface DecideModalProps {
  step:     IApprovalStep;
  mode:     DecideMode;
  onClose:  () => void;
  onSuccess: () => void;
}

export function DecideModal({ step, mode, onClose, onSuccess }: DecideModalProps) {
  const [remarks, setRemarks]               = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const approveStep = useApproveStep();
  const rejectStep  = useRejectStep();
  const requestRevision = useRequestRevision();

  const isApproving = mode === 'approve';
  const isRejecting = mode === 'reject';
  const isRevision  = mode === 'revision_resume' || mode === 'revision_restart';

  const isLoading =
    approveStep.isPending ||
    rejectStep.isPending ||
    requestRevision.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isApproving) {
      await approveStep.mutateAsync({
        stepId: step.id,
        dto:    { remarks: remarks || undefined },
      });
    } else if (isRejecting) {
      await rejectStep.mutateAsync({
        stepId: step.id,
        dto:    { remarks: remarks || undefined, rejectionReason },
      });
    } else if (isRevision) {
      const revisionType: RevisionType = mode === 'revision_resume'
        ? 'REVISION_RESUME'
        : 'REVISION_RESTART';

      await requestRevision.mutateAsync({
        stepId: step.id,
        dto:    { revisionType, remarks },
      });
    }

    onSuccess();
    onClose();
  };

  const error = approveStep.error || rejectStep.error || requestRevision.error;

  // Validation
  const canSubmit = () => {
    if (isLoading) return false;
    if (isRejecting) return rejectionReason.length >= 10;
    if (isRevision) return remarks.length >= 10;
    return true; // approve always valid
  };

  const getTitle = () => {
    if (isApproving) return 'Approve Request';
    if (isRejecting) return 'Reject Request';
    if (mode === 'revision_resume') return 'Request Revision (Resume)';
    return 'Request Revision (Restart)';
  };

  const getSubmitLabel = () => {
    if (isLoading) {
      if (isApproving) return 'Approving...';
      if (isRejecting) return 'Rejecting...';
      return 'Requesting...';
    }
    if (isApproving) return 'Confirm Approval';
    if (isRejecting) return 'Confirm Rejection';
    return 'Request Revision';
  };

  const getSubmitButtonClass = () => {
    if (isApproving) return 'bg-green-600 text-white hover:bg-green-700';
    if (isRejecting) return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
    // Revision — amber/orange to distinguish from approve/reject
    return 'bg-amber-600 text-white hover:bg-amber-700';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {getTitle()}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {step.approverTitle} — {step.request?.referenceNumber}
          </p>
        </div>

        {/* Revision info banner */}
        {isRevision && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-xs text-amber-800 font-medium">
              {mode === 'revision_resume'
                ? 'REVISION_RESUME: The requestor will edit and the chain will resume from this step. Approved steps remain approved.'
                : 'REVISION_RESTART: The requestor will edit and the entire approval chain will restart from Stage 1. All prior approvals are cleared.'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rejection reason — required on reject */}
          {isRejecting && (
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
          )}

          {/* Remarks / Revision reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {isRevision ? (
                <>Revision Remarks <span className="text-destructive">*</span></>
              ) : (
                <>Remarks <span className="text-muted-foreground font-normal">(optional)</span></>
              )}
            </label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={isRevision ? 4 : 2}
              required={isRevision}
              minLength={isRevision ? 10 : undefined}
              placeholder={
                isRevision
                  ? 'Explain what needs to be revised (min 10 characters)...'
                  : isApproving
                    ? 'Add any notes for the requestor...'
                    : 'Additional notes...'
              }
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            {isRevision && remarks.length > 0 && remarks.length < 10 && (
              <p className="text-xs text-destructive">
                {10 - remarks.length} more characters required
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">
              {(error as any)?.response?.data?.message ?? 'Something went wrong. Please try again.'}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2 text-sm border border-input rounded-md bg-background hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit()}
              className={`flex-1 py-2 text-sm font-medium rounded-md disabled:opacity-50 transition-colors ${getSubmitButtonClass()}`}
            >
              {getSubmitLabel()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}