// File: apps/frontend/lib/audit-logs/api.ts

import { apiClient } from '../axios';
import type {
  IAuditLog, IAuditLogsQuery, IAuditLogsResponse,
} from './types';

export async function getAuditLogs(
  query?: IAuditLogsQuery,
): Promise<IAuditLogsResponse> {
  const res = await apiClient.get<IAuditLogsResponse>(
    '/audit-logs', { params: query },
  );
  return res.data;
}

export async function getAuditLogById(id: string): Promise<IAuditLog> {
  const res = await apiClient.get<IAuditLog>(`/audit-logs/${id}`);
  return res.data;
}

export async function getAuditLogsByRequest(
  requestId: string,
): Promise<IAuditLog[]> {
  const res = await apiClient.get<IAuditLog[]>(
    `/audit-logs/request/${requestId}`,
  );
  return res.data;
}