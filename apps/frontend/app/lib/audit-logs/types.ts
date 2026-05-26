// File: apps/frontend/lib/audit-logs/types.ts

import type { IPaginatedResponse } from '../types';

export interface IAuditLog {
  id:            string;
  performedById: string | null;
  requestId:     string | null;
  action:        string;
  entity:        string;
  entityId:      string | null;
  snapshot:      Record<string, any> | null;
  ipAddress:     string | null;
  userAgent:     string | null;
  createdAt:     string;
  performedBy?: {
    id:    string;
    name:  string;
    email: string;
    role:  string;
  } | null;
}

export interface IAuditLogsQuery {
  page?:      number;
  limit?:     number;
  action?:    string;
  entity?:    string;
  userId?:    string;
  requestId?: string;
  dateFrom?:  string;
  dateTo?:    string;
  search?:    string;
}

export type IAuditLogsResponse = IPaginatedResponse<IAuditLog>;