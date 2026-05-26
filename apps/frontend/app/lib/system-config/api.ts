// File: apps/frontend/lib/system-config/api.ts

import { apiClient } from '../axios';
import type {
  ISystemConfig,
  ISystemConfigQuery,
  ISystemConfigResponse,
  IUpdateSystemConfigDto,
  IUpsertSystemConfigDto,
} from './types';

export async function getSystemConfigs(
  query?: ISystemConfigQuery,
): Promise<ISystemConfigResponse> {
  const res = await apiClient.get<ISystemConfigResponse>(
    '/system-config', { params: query },
  );
  return res.data;
}

export async function getSystemConfigByKey(key: string): Promise<ISystemConfig> {
  const res = await apiClient.get<ISystemConfig>(`/system-config/${key}`);
  return res.data;
}

export async function upsertSystemConfig(
  dto: IUpsertSystemConfigDto,
): Promise<ISystemConfig> {
  const res = await apiClient.post<ISystemConfig>('/system-config', dto);
  return res.data;
}

export async function updateSystemConfig(
  key: string, dto: IUpdateSystemConfigDto,
): Promise<ISystemConfig> {
  const res = await apiClient.patch<ISystemConfig>(`/system-config/${key}`, dto);
  return res.data;
}

export async function deleteSystemConfig(key: string): Promise<void> {
  await apiClient.delete(`/system-config/${key}`);
}