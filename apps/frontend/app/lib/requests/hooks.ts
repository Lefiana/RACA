// File: apps/frontend/lib/requests/hooks.ts
// Purpose: TanStack Query hooks for the request lifecycle.
// Dependencies: @tanstack/react-query, requests/api

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelRequest,
  createRequest,
  getRequestById,
  getRequests,
  submitRequest,
  updateRequest,
} from './api';
import type { ICreateRequestDto, IRequestsQuery, IUpdateRequestDto } from './types';

export const requestKeys = {
  all:    ['requests']                                   as const,
  lists:  () => [...requestKeys.all, 'list']             as const,
  list:   (q: IRequestsQuery) => [...requestKeys.lists(), q] as const,
  detail: (id: string) => [...requestKeys.all, 'detail', id] as const,
};

export function useRequests(query?: IRequestsQuery) {
  return useQuery({
    queryKey: requestKeys.list(query ?? {}),
    queryFn:  () => getRequests(query),
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

export function useUpdateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateRequestDto }) =>
      updateRequest(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    },
  });
}

export function useSubmitRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, adviserId }: { id: string; adviserId: string }) =>
      submitRequest(id, adviserId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['requests', data.id] });
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