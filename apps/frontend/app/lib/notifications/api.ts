// File: apps/frontend/lib/notifications/api.ts

import { apiClient } from '../axios';
import type {
  INotification,
  INotificationsQuery,
  INotificationsResponse,
} from './types';

export async function getNotifications(
  query?: INotificationsQuery,
): Promise<INotificationsResponse> {
  const res = await apiClient.get<INotificationsResponse>(
    '/notifications', { params: query },
  );
  return res.data;
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const res = await apiClient.get<{ count: number }>(
    '/notifications/unread-count',
  );
  return res.data;
}

export async function markOneRead(id: string): Promise<INotification> {
  const res = await apiClient.patch<INotification>(
    `/notifications/${id}/read`,
  );
  return res.data;
}

export async function markAllRead(): Promise<{ success: boolean }> {
  const res = await apiClient.patch<{ success: boolean }>(
    '/notifications/read-all',
  );
  return res.data;
}