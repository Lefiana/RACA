// File: apps/frontend/lib/users/api.ts
// Purpose: User management API calls.
// Dependencies: apiClient, users/types

import { apiClient } from '../axios';
import type {
  IUser,
  IUsersQuery,
  IUsersResponse,
  IUpdateRoleDto,
} from './types';

export async function getUsers(query?: IUsersQuery): Promise<IUsersResponse> {
  const res = await apiClient.get<IUsersResponse>('/users', { params: query });
  return res.data;
}

export async function getUserById(id: string): Promise<IUser> {
  const res = await apiClient.get<IUser>(`/users/${id}`);
  return res.data;
}

export async function getMe(): Promise<IUser> {
  const res = await apiClient.get<IUser>('/users/me');
  return res.data;
}

export async function updateUserRole(id: string, dto: IUpdateRoleDto): Promise<IUser> {
  const res = await apiClient.patch<IUser>(`/users/${id}/role`, dto);
  return res.data;
}

export async function toggleUserActive(id: string): Promise<IUser> {
  const res = await apiClient.patch<IUser>(`/users/${id}/toggle-active`);
  return res.data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}