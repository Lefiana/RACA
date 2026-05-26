// File: apps/frontend/lib/notifications/hooks.ts
// CHANGED: explicit return type annotation on the socket ref to satisfy TypeScript

'use client';

import { useEffect, useRef }                      from 'react';
import { useMutation, useQuery, useQueryClient }  from '@tanstack/react-query';
import { io, Socket }                             from 'socket.io-client';
import { env }                                    from '../../../env';
import {
  getNotifications, getUnreadCount,
  markAllRead, markOneRead,
} from './api';
import type { INotification, INotificationsQuery } from './types';

export const notificationKeys = {
  all:         ['notifications']                                             as const,
  lists:       () => [...notificationKeys.all, 'list']                      as const,
  list:        (q: INotificationsQuery) => [...notificationKeys.lists(), q] as const,
  unreadCount: ['notifications', 'unread-count']                            as const,
};

export function useNotifications(query?: INotificationsQuery) {
  return useQuery({
    queryKey: notificationKeys.list(query ?? {}),
    queryFn:  () => getNotifications(query),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn:  getUnreadCount,
    refetchInterval: 60 * 1000,
  });
}

export function useMarkOneRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markOneRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}

// CHANGED: explicit return type React.MutableRefObject<Socket | null>
// This tells TypeScript exactly what the ref holds without it trying to
// infer the full Socket generic chain from socket.io-client internals.
export function useNotificationSocket(): React.MutableRefObject<Socket | null> {
  const queryClient = useQueryClient();
  const socketRef   = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(`${env.wsUrl}/notifications`, {
      withCredentials: true,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] connected to /notifications');
    });

    socket.on('notification.new', (data: { notification: INotification }) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
      queryClient.setQueryData(
        ['notifications', 'latest'],
        data.notification,
      );
    });

    socket.on('disconnect', (reason: string) => {
      console.log('[Socket] disconnected:', reason);
    });

    socket.on('connect_error', (err: Error) => {
      console.error('[Socket] connection error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  return socketRef;
}