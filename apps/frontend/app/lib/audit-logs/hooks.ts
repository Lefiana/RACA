// File: apps/frontend/lib/audit-logs/hooks.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getAuditLogById, getAuditLogs, getAuditLogsByRequest,
} from './api';
import type { IAuditLogsQuery } from './types';

export const auditLogKeys = {
  all:       ['audit-logs']                                             as const,
  lists:     () => [...auditLogKeys.all, 'list']                        as const,
  list:      (q: IAuditLogsQuery) => [...auditLogKeys.lists(), q]       as const,
  detail:    (id: string) => [...auditLogKeys.all, 'detail', id]        as const,
  byRequest: (requestId: string) =>
    [...auditLogKeys.all, 'request', requestId]                         as const,
};

export function useAuditLogs(query?: IAuditLogsQuery) {
  return useQuery({
    queryKey: auditLogKeys.list(query ?? {}),
    queryFn:  () => getAuditLogs(query),
  });
}

export function useAuditLog(id: string) {
  return useQuery({
    queryKey: auditLogKeys.detail(id),
    queryFn:  () => getAuditLogById(id),
    enabled:  !!id,
  });
}

export function useAuditLogsByRequest(requestId: string) {
  return useQuery({
    queryKey: auditLogKeys.byRequest(requestId),
    queryFn:  () => getAuditLogsByRequest(requestId),
    enabled:  !!requestId,
  });
}