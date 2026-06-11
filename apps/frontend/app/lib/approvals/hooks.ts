// File: apps/frontend/lib/approvals/hooks.ts
// Purpose: TanStack Query hooks for the approval chain.
// Dependencies: @tanstack/react-query, approvals/api

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveStep,
  getApprovalsByRequest,
  getPendingApprovals,
  rejectStep,
  getStepById
} from './api';
import type { IApprovalsQuery, IDecideApprovalDto } from './types';
import { requestKeys } from '../requests/hooks';

export const approvalKeys = {
  all:     ['approvals']                                       as const,
  pending: (q: IApprovalsQuery) => ['approvals', 'pending', q] as const,
  byRequest: (requestId: string) =>
    ['approvals', 'request', requestId]                        as const,
};

export function usePendingApprovals(query?: IApprovalsQuery) {
  return useQuery({
    queryKey: approvalKeys.pending(query ?? {}),
    queryFn:  () => getPendingApprovals(query),
  });
}

export function useApprovalStep(stepId: string) {
  return useQuery({
    queryKey: [...approvalKeys.all, 'step', stepId],
    queryFn:  () => getStepById(stepId),
    enabled:  !!stepId,
  });
}

export function useApprovalsByRequest(requestId: string) {
  return useQuery({
    queryKey: approvalKeys.byRequest(requestId),
    queryFn:  () => getApprovalsByRequest(requestId),
    enabled:  !!requestId,
  });
}

export function useApproveStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stepId, dto }: { stepId: string; dto: IDecideApprovalDto }) =>
      approveStep(stepId, dto),
    onSuccess: (data) => {
      // Invalidate the request detail and pending queue
      queryClient.invalidateQueries({
        queryKey: requestKeys.detail(data.requestId),
      });
      queryClient.invalidateQueries({
        queryKey: approvalKeys.byRequest(data.requestId),
      });
      queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] });
    },
  });
}

export function useRejectStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stepId, dto }: { stepId: string; dto: IDecideApprovalDto }) =>
      rejectStep(stepId, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: requestKeys.detail(data.requestId),
      });
      queryClient.invalidateQueries({
        queryKey: approvalKeys.byRequest(data.requestId),
      });
      queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] });
    },
  });
}