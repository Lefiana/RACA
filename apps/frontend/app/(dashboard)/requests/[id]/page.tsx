// File: apps/frontend/app/(dashboard)/requests/[id]/page.tsx
// CHANGED: Added REVISION_REQUESTED status, revision banner, resubmit flow,
//          and revision action buttons for approvers
'use client';

import { useState, useEffect }   from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link                       from 'next/link';
import { useRequest, useSubmitRequest, useCancelRequest, useResubmitRequest } from '../../../lib/requests/hooks';
import { useRequestRevision }     from '../../../lib/approvals/hooks';
import { useCurrentUser }         from '../../../lib/auth/hooks';
import { DecideModal }            from '../../approvals/decide-modal';
import type { RequestStatus }     from '../../../lib/requests/types';
import type { IApprovalStep }     from '../../../lib/approvals/types';

// CHANGED: Added REVISION_REQUESTED
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
  REVISION_REQUESTED: 'bg-amber-100 text-amber-800', // ← NEW
};

// CHANGED: Added REVISION_REQUESTED, SUSPENDED
const STEP_STATUS_COLORS: Record<string, string> = {
  PENDING:            'bg-yellow-100 text-yellow-800',
  APPROVED:           'bg-green-100 text-green-800',
  REJECTED:           'bg-red-100 text-red-800',
  SKIPPED:            'bg-muted text-muted-foreground',
  REVISION_REQUESTED: 'bg-amber-100 text-amber-800', // ← NEW
  SUSPENDED:          'bg-orange-100 text-orange-800', // ← NEW
};

export default function RequestDetailPage() {
  const { id }           = useParams<{ id: string }>();
  const router           = useRouter();
  const searchParams     = useSearchParams();
  const { user }         = useCurrentUser();

  const { data: request, isLoading, isError, error, refetch } = useRequest(id);
  const submitRequest  = useSubmitRequest();
  const cancelRequest  = useCancelRequest();
  const resubmitRequest = useResubmitRequest(id); // ← NEW

  // Modal state — CHANGED: added revision modes
  const [modalStep, setModalStep]   = useState<IApprovalStep | null>(null);
  const [modalMode, setModalMode]   = useState<'approve' | 'reject' | 'revision_resume' | 'revision_restart'>('approve');

  // Auto-open modal if ?stepId= is in the URL
  const stepIdFromUrl = searchParams.get('stepId');

  useEffect(() => {
    if (stepIdFromUrl && request?.approvalSteps) {
      const step = request.approvalSteps.find(s => s.id === stepIdFromUrl);
      if (step && step.status === 'PENDING') {
        setModalStep(step as IApprovalStep);
        setModalMode('approve');
      }
    }
  }, [stepIdFromUrl, request]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading request...</p>
      </div>
    );
  }

  if (isError || !request) {
    const status = (error as any)?.response?.status;
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-2">
          <p className="text-sm text-destructive">
            {status === 403
              ? 'You do not have permission to view this request.'
              : 'Request not found.'}
          </p>
          <Link href="/requests" className="text-sm text-primary hover:underline">
            ← Back to Requests
          </Link>
        </div>
      </div>
    );
  }

  const isOwner   = user?.id === request.requestedById;
  const canEdit   = isOwner && (request.status === 'DRAFT' || request.status === 'PENDING');
  const canSubmit = isOwner && request.status === 'DRAFT';
  const canCancel = isOwner && (request.status === 'DRAFT' || request.status === 'PENDING');
  const canResubmit = isOwner && request.status === 'REVISION_REQUESTED'; // ← NEW

  // Find the step this user can act on
  const myPendingStep = request.approvalSteps?.find(
    s => s.status === 'PENDING' && (s.approverId === user?.id),
  ) as IApprovalStep | undefined;

  // ── NEW: Find any step this user can request revision on ────────────────
  const myActionableStep = request.approvalSteps?.find(
    s => s.status === 'PENDING' && s.approverId === user?.id,
  ) as IApprovalStep | undefined;

  const handleSubmit = async () => {
    // NOTE: Your existing code passes just `id`. If this is wrong for your API,
    // change to: await submitRequest.mutateAsync({ id, adviserId: '...' });
    await submitRequest.mutateAsync(id);
    refetch();
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    await cancelRequest.mutateAsync(id);
    router.push('/requests');
  };

  // ── NEW: Handle resubmit ────────────────────────────────────────────────
  const handleResubmit = async () => {
    if (!confirm('Are you sure you want to resubmit this request?')) return;
    await resubmitRequest.mutateAsync({});
    refetch();
  };

  // ── NEW: Get revision info ──────────────────────────────────────────────
  const triggeringStep = request.approvalSteps?.find(
    s => s.status === 'REVISION_REQUESTED',
  );
  const revisionType = triggeringStep?.revisionType;
  const revisionRemarks = triggeringStep?.remarks;
  const revisedBy = triggeringStep?.approverName ?? triggeringStep?.approverTitle ?? 'An approver';

  return (
    <div className="max-w-3xl space-y-6">
      {/* Modal */}
      {modalStep && (
        <DecideModal
          step={modalStep}
          mode={modalMode}
          onClose={() => setModalStep(null)}
          onSuccess={() => refetch()}
        />
      )}

      {/* ── NEW: Revision Requested Banner ───────────────────────────────── */}
      {request.status === 'REVISION_REQUESTED' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-xl">↺</span>
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-semibold text-amber-900">
                Revision {revisionType === 'REVISION_RESTART' ? 'Restart' : 'Resume'} Requested
              </h3>
              <p className="text-sm text-amber-800">
                {revisedBy} requested revisions on this request.
              </p>
              {revisionRemarks && (
                <div className="mt-2 p-3 bg-white/60 rounded-md">
                  <p className="text-xs text-amber-700 font-medium">Reason for revision:</p>
                  <p className="text-sm text-amber-900 mt-1">{revisionRemarks}</p>
                </div>
              )}
              <div className="text-xs text-amber-700 mt-2">
                {revisionType === 'REVISION_RESTART'
                  ? 'The full approval chain will restart from Stage 1 after you resubmit.'
                  : 'The approval chain will resume from the current step after you resubmit.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/requests" className="text-sm text-muted-foreground hover:text-foreground">
            ← Requests
          </Link>
          <h1 className="text-2xl font-semibold text-foreground mt-2">
            {request.activityTitle}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="font-mono text-xs text-muted-foreground">
              {request.referenceNumber}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[request.status]}`}>
              {request.status.replace(/_/g, ' ')}
            </span>
            {/* ── NEW: Show revision count if any ───────────────────────── */}
            {request.revisionCount > 0 && (
              <span className="text-xs text-muted-foreground">
                (Revision #{request.revisionCount})
              </span>
            )}
          </div>
          {/* ── NEW: Show approval group ───────────────────────────────── */}
          {request.approvalGroup && (
            <p className="text-xs text-muted-foreground mt-1">
              Approval Group: {request.approvalGroup.replace(/_/g, ' ')}
            </p>
          )}
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          {/* Approver actions — CHANGED: added revision buttons */}
          {myPendingStep && (
            <>
              <button
                onClick={() => { setModalStep(myPendingStep); setModalMode('reject'); }}
                className="px-3 py-2 text-sm border border-destructive/50 text-destructive rounded-md hover:bg-destructive/10 transition-colors"
              >
                Reject
              </button>
              {/* ── NEW: Request Revision dropdown ─────────────────────── */}
              <div className="relative group">
                <button className="px-3 py-2 text-sm border border-amber-500/50 text-amber-700 rounded-md hover:bg-amber-50 transition-colors">
                  ↺ Revision
                </button>
                <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => { setModalStep(myPendingStep); setModalMode('revision_resume'); }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-muted first:rounded-t-md"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => { setModalStep(myPendingStep); setModalMode('revision_restart'); }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-muted last:rounded-b-md"
                  >
                    Restart
                  </button>
                </div>
              </div>
              <button
                onClick={() => { setModalStep(myPendingStep); setModalMode('approve'); }}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Approve
              </button>
            </>
          )}

          {/* Owner actions — CHANGED: added resubmit */}
          {canEdit && (
            <Link
              href={`/requests/${id}/edit`}
              className="px-3 py-2 text-sm border border-input rounded-md bg-background hover:bg-muted transition-colors"
            >
              Edit
            </Link>
          )}
          {canSubmit && (
            <button
              onClick={handleSubmit}
              disabled={submitRequest.isPending}
              className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitRequest.isPending ? 'Submitting...' : 'Submit'}
            </button>
          )}
          {canResubmit && (
            <button
              onClick={handleResubmit}
              disabled={resubmitRequest.isPending}
              className="px-3 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {resubmitRequest.isPending ? 'Resubmitting...' : 'Resubmit'}
            </button>
          )}
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelRequest.isPending}
              className="px-3 py-2 text-sm border border-destructive/50 text-destructive rounded-md hover:bg-destructive/10 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        <div className="p-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Requestor</p>
            <p className="font-medium text-foreground mt-1">{request.requestedBy?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Department</p>
            <p className="font-medium text-foreground mt-1">{request.requestedBy?.department ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Start</p>
            <p className="font-medium text-foreground mt-1">
              {new Date(request.activityStartAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">End</p>
            <p className="font-medium text-foreground mt-1">
              {new Date(request.activityEndAt).toLocaleString()}
            </p>
          </div>
          {request.theme && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Theme</p>
              <p className="font-medium text-foreground mt-1">{request.theme}</p>
            </div>
          )}
        </div>

        <div className="p-6 text-sm">
          <p className="text-muted-foreground">Objectives</p>
          <p className="text-foreground mt-2 whitespace-pre-wrap">{request.objectives}</p>
        </div>

        {request.venueDescription && (
          <div className="p-6 text-sm">
            <p className="text-muted-foreground">Venue Description</p>
            <p className="text-foreground mt-2">{request.venueDescription}</p>
          </div>
        )}

        {request.equipmentDescription && (
          <div className="p-6 text-sm">
            <p className="text-muted-foreground">Equipment Description</p>
            <p className="text-foreground mt-2">{request.equipmentDescription}</p>
          </div>
        )}

        {request.speakers && request.speakers.length > 0 && (
          <div className="p-6 text-sm">
            <p className="text-muted-foreground mb-3">Speakers</p>
            <div className="space-y-2">
              {request.speakers.map((s, i) => (
                <div key={i} className="flex gap-4">
                  <span className="font-medium text-foreground">{s.name}</span>
                  {s.position     && <span className="text-muted-foreground">{s.position}</span>}
                  {s.organization && <span className="text-muted-foreground">{s.organization}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {(request.expectedAudience || request.expectedHeadcount) && (
          <div className="p-6 grid grid-cols-2 gap-4 text-sm">
            {request.expectedAudience && (
              <div>
                <p className="text-muted-foreground">Expected Audience</p>
                <p className="font-medium text-foreground mt-1">{request.expectedAudience}</p>
              </div>
            )}
            {request.expectedHeadcount && (
              <div>
                <p className="text-muted-foreground">Expected Headcount</p>
                <p className="font-medium text-foreground mt-1">{request.expectedHeadcount}</p>
              </div>
            )}
          </div>
        )}

        {request.remarks && (
          <div className="p-6 text-sm">
            <p className="text-muted-foreground">Remarks</p>
            <p className="text-foreground mt-2">{request.remarks}</p>
          </div>
        )}
      </div>

      {/* Approval Chain */}
      {request.approvalSteps && request.approvalSteps.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Approval Chain</h2>
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {request.approvalSteps.map(step => (
              <div key={step.id} className="p-4 flex items-start gap-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {step.stepOrder}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {step.approverTitle ?? step.stage.replace(/_/g, ' ')}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STEP_STATUS_COLORS[step.status]}`}>
                      {step.status.replace(/_/g, ' ')}
                    </span>
                    {/* Action buttons for this user's pending step */}
                    {step.status === 'PENDING' && step.approverId === user?.id && (
                      <div className="flex gap-1 ml-auto">
                        <button
                          onClick={() => { setModalStep(step as IApprovalStep); setModalMode('reject'); }}
                          className="px-2 py-0.5 text-xs border border-destructive/50 text-destructive rounded hover:bg-destructive/10 transition-colors"
                        >
                          Reject
                        </button>
                        {/* ── NEW: Revision button on each step ─────────── */}
                        <div className="relative group">
                          <button className="px-2 py-0.5 text-xs border border-amber-500/50 text-amber-700 rounded hover:bg-amber-50 transition-colors">
                            ↺
                          </button>
                          <div className="absolute right-0 bottom-full mb-1 w-36 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                              onClick={() => { setModalStep(step as IApprovalStep); setModalMode('revision_resume'); }}
                              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-muted first:rounded-t-md"
                            >
                              Resume
                            </button>
                            <button
                              onClick={() => { setModalStep(step as IApprovalStep); setModalMode('revision_restart'); }}
                              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-muted last:rounded-b-md"
                            >
                              Restart
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => { setModalStep(step as IApprovalStep); setModalMode('approve'); }}
                          className="px-2 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                  {step.approverName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.approverName}
                      {step.decidedAt && ` · ${new Date(step.decidedAt).toLocaleDateString()}`}
                    </p>
                  )}
                  {step.remarks && (
                    <p className="text-xs text-foreground mt-1 italic">"{step.remarks}"</p>
                  )}
                  {step.rejectionReason && (
                    <p className="text-xs text-destructive mt-1">
                      Reason: {step.rejectionReason}
                    </p>
                  )}
                  {/* ── NEW: Show revision info on step ─────────────────── */}
                  {step.status === 'REVISION_REQUESTED' && step.revisionType && (
                    <p className="text-xs text-amber-700 mt-1">
                      Revision type: {step.revisionType.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}