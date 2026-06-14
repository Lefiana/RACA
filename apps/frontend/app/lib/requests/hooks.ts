// File: apps/frontend/lib/requests/hooks.ts
// Purpose: TanStack Query hooks for the request lifecycle.
// Dependencies: @tanstack/react-query, requests/api, requests/types

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getRequests,
  getRequestById,
  createRequest,
  updateRequest,
  submitRequest,
  cancelRequest,
} from './api';
import type {
  ICreateRequestDto,
  IUpdateRequestDto,
  ISubmitRequestDto,
  IGetRequestsParams,
} from './types';

// Query key factory — keeps keys consistent across hooks and invalidations
export const requestKeys = {
  all:    ['requests'] as const,
  lists:  () => [...requestKeys.all, 'list'] as const,
  list:   (params: IGetRequestsParams) => [...requestKeys.lists(), params] as const,
  detail: (id: string) => [...requestKeys.all, 'detail', id] as const,
};

// CHANGED: params object (including viewMode) is part of the query key.
// Switching from my_requests to for_my_review triggers a clean refetch.
export function useRequests(params: IGetRequestsParams = {}) {
  return useQuery({
    queryKey: requestKeys.list(params),
    queryFn:  () => getRequests(params),
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: requestKeys.detail(id),
    queryFn:  () => getRequestById(id),
    enabled:  !!id,
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateRequestDto) => createRequest(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    },
  });
}

export function useUpdateRequest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: IUpdateRequestDto) => updateRequest(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(id) });
    },
  });
}

// CHANGED: mutationFn now structured to directly process structured state object payloads:
// { id: string; adviserId: string } or nested payload models safely.
export function useSubmitRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adviserId }: { id: string; adviserId: string }) =>
      submitRequest(id, { adviserId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(data.id) });
    },
  });
}

export function useCancelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    },
  });
}