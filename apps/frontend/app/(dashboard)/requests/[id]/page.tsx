// File: apps/frontend/app/(dashboard)/requests/[id]/page.tsx
// CHANGED: added approval action buttons and DecideModal for approvers
'use client';

import { useState, useEffect }   from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link                       from 'next/link';
import { useRequest, useSubmitRequest, useCancelRequest } from '../../../lib/requests/hooks';
import { useCurrentUser }         from '../../../lib/auth/hooks';
import { DecideModal }            from '../../approvals/decide-modal';
import type { RequestStatus }     from '../../../lib/requests/types';
import type { IApprovalStep }     from '../../../lib/approvals/types';

const STATUS_COLORS: Record<RequestStatus, string> = {
  DRAFT:         'bg-muted text-muted-foreground',
  PENDING:       'bg-yellow-100 text-yellow-800',
  STAGE1_REVIEW: 'bg-blue-100 text-blue-800',
  STAGE2_REVIEW: 'bg-blue-100 text-blue-800',
  PENDING_FINAL: 'bg-purple-100 text-purple-800',
  APPROVED:      'bg-green-100 text-green-800',
  REJECTED:      'bg-red-100 text-red-800',
  CANCELLED:     'bg-muted text-muted-foreground',
  COMPLETED:     'bg-green-100 text-green-800',
};

const STEP_STATUS_COLORS: Record<string, string> = {
  PENDING:  'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  SKIPPED:  'bg-muted text-muted-foreground',
};

export default function RequestDetailPage() {
  const { id }           = useParams<{ id: string }>();
  const router           = useRouter();
  const searchParams     = useSearchParams();
  const { user }         = useCurrentUser();
  

  const { data: request, isLoading, isError, error , refetch } = useRequest(id);
  const submitRequest  = useSubmitRequest();
  const cancelRequest  = useCancelRequest();

  // Modal state
  const [modalStep, setModalStep]   = useState<IApprovalStep | null>(null);
  const [modalMode, setModalMode]   = useState<'approve' | 'reject'>('approve');

  // Auto-open modal if ?stepId= is in the URL (coming from approvals queue)
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
    // CHANGED: check the actual error type
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

  // Find the step this user can act on
  const myPendingStep = request.approvalSteps?.find(
    s => s.status === 'PENDING' && (s.approverId === user?.id),
  ) as IApprovalStep | undefined;

  const handleSubmit = async () => {
    await submitRequest.mutateAsync(id);
    refetch();
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    await cancelRequest.mutateAsync(id);
    router.push('/requests');
  };

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
          </div>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          {/* Approver actions */}
          {myPendingStep && (
            <>
              <button
                onClick={() => { setModalStep(myPendingStep); setModalMode('reject'); }}
                className="px-3 py-2 text-sm border border-destructive/50 text-destructive rounded-md hover:bg-destructive/10 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => { setModalStep(myPendingStep); setModalMode('approve'); }}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Approve
              </button>
            </>
          )}

          {/* Owner actions */}
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
                      {step.status}
                    </span>
                    {/* Action button for this user's pending step */}
                    {step.status === 'PENDING' && step.approverId === user?.id && (
                      <div className="flex gap-1 ml-auto">
                        <button
                          onClick={() => { setModalStep(step as IApprovalStep); setModalMode('reject'); }}
                          className="px-2 py-0.5 text-xs border border-destructive/50 text-destructive rounded hover:bg-destructive/10 transition-colors"
                        >
                          Reject
                        </button>
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}