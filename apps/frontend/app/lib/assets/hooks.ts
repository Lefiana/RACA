// File: apps/frontend/lib/assets/hooks.ts
// Purpose: TanStack Query hooks for asset management.

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAsset, deleteAsset, getActiveCheckouts,
  getAssetById, getAssets, importAssetsCsv,
  processCheckout, processReturn, setAssetStatus, updateAsset,
} from './api';
import type {
  IAssetsQuery, ICreateAssetDto, IProcessCheckoutDto,
  ISetAssetStatusDto, IUpdateAssetDto,
} from './types';

export const assetKeys = {
  all:             ['assets']                                       as const,
  lists:           () => [...assetKeys.all, 'list']                 as const,
  list:            (q: IAssetsQuery) => [...assetKeys.lists(), q]   as const,
  detail:          (id: string) => [...assetKeys.all, 'detail', id] as const,
  activeCheckouts: ['assets', 'checkouts', 'active']                as const,
};

export function useAssets(query?: IAssetsQuery) {
  return useQuery({
    queryKey: assetKeys.list(query ?? {}),
    queryFn:  () => getAssets(query),
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn:  () => getAssetById(id),
    enabled:  !!id,
  });
}

export function useActiveCheckouts() {
  return useQuery({
    queryKey: assetKeys.activeCheckouts,
    queryFn:  getActiveCheckouts,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateAssetDto) => createAsset(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateAssetDto }) =>
      updateAsset(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

export function useSetAssetStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ISetAssetStatusDto }) =>
      setAssetStatus(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

export function useProcessCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ checkoutId, dto }: { checkoutId: string; dto: IProcessCheckoutDto }) =>
      processCheckout(checkoutId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.activeCheckouts });
    },
  });
}

export function useProcessReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ checkoutId, dto }: { checkoutId: string; dto: IProcessCheckoutDto }) =>
      processReturn(checkoutId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.activeCheckouts });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

export function useImportAssetsCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importAssetsCsv(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}