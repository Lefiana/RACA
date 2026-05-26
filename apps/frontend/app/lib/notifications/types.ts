// File: apps/frontend/lib/notifications/types.ts

import type { IPaginatedResponse } from '../types';

export type NotificationType =
  | 'REQUEST_SUBMITTED' | 'REQUEST_APPROVED' | 'REQUEST_REJECTED'
  | 'STAGE_ADVANCED'    | 'STEP_APPROVED'    | 'STEP_REJECTED'
  | 'ASSET_CHECKED_OUT' | 'ASSET_RETURNED'
  | 'ASSET_DUE'         | 'ASSET_OVERDUE'    | 'SYSTEM';

export interface INotification {
  id:        string;
  userId:    string;
  requestId: string | null;
  stepId:    string | null;
  type:      NotificationType;
  title:     string;
  body:      string;
  metadata:  Record<string, any>;
  isRead:    boolean;
  readAt:    string | null;
  createdAt: string;
}

export interface INotificationsQuery {
  page?:       number;
  limit?:      number;
  unreadOnly?: boolean;
}

export type INotificationsResponse = IPaginatedResponse<INotification>;