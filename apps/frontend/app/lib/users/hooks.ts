// File: apps/frontend/lib/users/hooks.ts
// Purpose: TanStack Query hooks for user management.
// Dependencies: @tanstack/react-query, users/api

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteUser,
  getMe,
  getUserById,
  getUsers,
  toggleUserActive,
  updateUserRole,
  createUser
} from './api';
import type { IUpdateRoleDto, IUsersQuery, ICreateUserDto} from './types';


export const userKeys = {
  all:    ['users']                              as const,
  lists:  () => [...userKeys.all, 'list']        as const,
  list:   (q: IUsersQuery) => [...userKeys.lists(), q] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  me:     ['users', 'me']                        as const,
};

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: ICreateUserDto) => createUser(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useUsers(query?: IUsersQuery) {
  return useQuery({
    queryKey: userKeys.list(query ?? {}),
    queryFn:  () => getUsers(query),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn:  () => getUserById(id),
    enabled:  !!id,
  });
}

export function useMe() {
  return useQuery({
    queryKey: userKeys.me,
    queryFn:  getMe,
    staleTime: 60 * 1000,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateRoleDto }) =>
      updateUserRole(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => toggleUserActive(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}