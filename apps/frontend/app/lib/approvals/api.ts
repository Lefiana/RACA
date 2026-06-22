// File: apps/frontend/app/lib/approvals/api.ts
// Purpose: Approval chain API calls.
// Dependencies: apiClient, approvals/types

import { apiClient } from '../axios';
import type {
  IApprovalStep,
  IApprovalsQuery,
  IApprovalsResponse,
  IDecideApprovalDto,
  IRequestRevisionDto,  // ← NEW
} from './types';

export async function getPendingApprovals(
  query?: IApprovalsQuery,
): Promise<IApprovalsResponse> {
  const res = await apiClient.get<IApprovalsResponse>('/approvals/pending', {
    params: query,
  });
  return res.data;
}

export async function getStepById(stepId: string): Promise<IApprovalStep> {
  const res = await apiClient.get<IApprovalStep>(`/approvals/${stepId}`);
  return res.data;
}

export async function getApprovalsByRequest(
  requestId: string,
): Promise<IApprovalStep[]> {
  const res = await apiClient.get<IApprovalStep[]>(
    `/approvals/request/${requestId}`,
  );
  return res.data;
}

export async function approveStep(
  stepId: string,
  dto: IDecideApprovalDto,
): Promise<IApprovalStep> {
  const res = await apiClient.post<IApprovalStep>(
    `/approvals/${stepId}/approve`,
    dto,
  );
  return res.data;
}

export async function rejectStep(
  stepId: string,
  dto: IDecideApprovalDto,
): Promise<IApprovalStep> {
  const res = await apiClient.post<IApprovalStep>(
    `/approvals/${stepId}/reject`,
    dto,
  );
  return res.data;
}

// ── NEW: Request revision on a step ───────────────────────────────────────
export async function requestRevision(
  stepId: string,
  dto: IRequestRevisionDto,
): Promise<IApprovalStep> {
  const res = await apiClient.post<IApprovalStep>(
    `/approvals/${stepId}/revision`,
    dto,
  );
  return res.data;
}