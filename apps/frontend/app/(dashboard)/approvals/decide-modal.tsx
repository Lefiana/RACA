// File: apps/frontend/app/(dashboard)/approvals/decide-modal.tsx
// Purpose: Reusable approve/reject modal
// Dependencies: useApproveStep, useRejectStep, IApprovalStep
'use client';

import { useState }           from 'react';
import { useApproveStep }     from '../../lib/approvals/hooks';
import { useRejectStep }      from '../../lib/approvals/hooks';
import type { IApprovalStep } from '../../lib/approvals/types';

interface DecideModalProps {
  step:     IApprovalStep;
  mode:     'approve' | 'reject';
  onClose:  () => void;
  onSuccess: () => void;
}

export function DecideModal({ step, mode, onClose, onSuccess }: DecideModalProps) {
  const [remarks, setRemarks]               = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const approveStep = useApproveStep();
  const rejectStep  = useRejectStep();

  const isApproving = mode === 'approve';
  const isLoading   = approveStep.isPending || rejectStep.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isApproving) {
      await approveStep.mutateAsync({
        stepId: step.id,
        dto:    { remarks: remarks || undefined },
      });
    } else {
      await rejectStep.mutateAsync({
        stepId: step.id,
        dto:    { remarks: remarks || undefined, rejectionReason },
      });
    }

    onSuccess();
    onClose();
  };

  const error = approveStep.error || rejectStep.error;

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
            {isApproving ? 'Approve Request' : 'Reject Request'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {step.approverTitle} · {step.request?.referenceNumber}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rejection reason — required on reject */}
          {!isApproving && (
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

          {/* Optional remarks */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Remarks <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={2}
              placeholder={isApproving
                ? 'Add any notes for the requestor...'
                : 'Additional notes...'}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
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
              disabled={isLoading || (!isApproving && rejectionReason.length < 10)}
              className={`flex-1 py-2 text-sm font-medium rounded-md disabled:opacity-50 transition-colors ${
                isApproving
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              }`}
            >
              {isLoading
                ? (isApproving ? 'Approving...' : 'Rejecting...')
                : (isApproving ? 'Confirm Approval' : 'Confirm Rejection')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}