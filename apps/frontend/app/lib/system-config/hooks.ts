// File: apps/frontend/lib/system-config/hooks.ts

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteSystemConfig, getSystemConfigByKey,
  getSystemConfigs, updateSystemConfig, upsertSystemConfig,
} from './api';
import type {
  ISystemConfigQuery, IUpdateSystemConfigDto, IUpsertSystemConfigDto,
} from './types';

export const systemConfigKeys = {
  all:    ['system-config']                                              as const,
  lists:  () => [...systemConfigKeys.all, 'list']                       as const,
  list:   (q: ISystemConfigQuery) => [...systemConfigKeys.lists(), q]   as const,
  detail: (key: string) => [...systemConfigKeys.all, 'detail', key]     as const,
};

export function useSystemConfigs(query?: ISystemConfigQuery) {
  return useQuery({
    queryKey: systemConfigKeys.list(query ?? {}),
    queryFn:  () => getSystemConfigs(query),
  });
}

export function useSystemConfig(key: string) {
  return useQuery({
    queryKey: systemConfigKeys.detail(key),
    queryFn:  () => getSystemConfigByKey(key),
    enabled:  !!key,
  });
}

export function useUpsertSystemConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: IUpsertSystemConfigDto) => upsertSystemConfig(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: systemConfigKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: systemConfigKeys.detail(data.key),
      });
    },
  });
}

export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, dto }: { key: string; dto: IUpdateSystemConfigDto }) =>
      updateSystemConfig(key, dto),
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: systemConfigKeys.lists() });
      queryClient.invalidateQueries({ queryKey: systemConfigKeys.detail(key) });
    },
  });
}

export function useDeleteSystemConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => deleteSystemConfig(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemConfigKeys.lists() });
    },
  });
}