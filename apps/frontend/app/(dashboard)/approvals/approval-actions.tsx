// File: apps/frontend/app/(dashboard)/approvals/approval-actions.tsx
// Purpose: Action buttons for an approver on a pending step.
//          Shows Approve, Reject, and Request Revision options.
// Dependencies: DecideModal, IApprovalStep
'use client';

import { useState } from 'react';
import { DecideModal } from './decide-modal';
import type { IApprovalStep } from '../../lib/approvals/types';

type ModalMode = 'approve' | 'reject' | 'revision_resume' | 'revision_restart' | null;

interface ApprovalActionsProps {
  step: IApprovalStep;
  onActionComplete: () => void;
}

export function ApprovalActions({ step, onActionComplete }: ApprovalActionsProps) {
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  // Only show actions if step is PENDING
  if (step.status !== 'PENDING') {
    return (
      <div className="text-sm text-muted-foreground">
        This step has been <span className="font-medium capitalize">{step.status.toLowerCase().replace('_', ' ')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {/* Approve */}
        <button
          onClick={() => setModalMode('approve')}
          className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          ✓ Approve
        </button>

        {/* Reject */}
        <button
          onClick={() => setModalMode('reject')}
          className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
        >
          ✕ Reject
        </button>

        {/* Revision dropdown */}
        <div className="relative group">
          <button
            className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
          >
            ↺ Request Revision
          </button>
          <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button
              onClick={() => setModalMode('revision_resume')}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-muted first:rounded-t-md last:rounded-b-md"
            >
              <span className="font-medium">Resume</span>
              <span className="block text-xs text-muted-foreground">Continue from this step</span>
            </button>
            <button
              onClick={() => setModalMode('revision_restart')}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-muted first:rounded-t-md last:rounded-b-md"
            >
              <span className="font-medium">Restart</span>
              <span className="block text-xs text-muted-foreground">Full restart from Stage 1</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalMode && (
        <DecideModal
          step={step}
          mode={modalMode}
          onClose={() => setModalMode(null)}
          onSuccess={onActionComplete}
        />
      )}
    </div>
  );
}