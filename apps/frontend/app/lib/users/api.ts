// File: apps/frontend/app/lib/users/api.ts
// CHANGED: added getAdvisers for public adviser listing

import axios from 'axios';
import { env } from '../../../env';
import { apiClient } from '../axios';
import type {
  IUser,
  IUsersQuery,
  IUsersResponse,
  IUpdateRoleDto,
  ICreateUserDto
} from './types';

// CHANGED: Two-step process — sign up via Better Auth without cookies, then assign role via admin client
export async function createUser(dto: ICreateUserDto): Promise<IUser> {
  const authClient = axios.create({
    baseURL: env.apiUrl.replace('/api/v1', ''),
    withCredentials: false,
    headers: { 'Content-Type': 'application/json' },
  });

  const signUpRes = await authClient.post('/api/auth/sign-up/email', {
    name:       dto.name,
    email:      dto.email,
    password:   dto.password,
    username:   dto.username || undefined,
    department: dto.department || undefined,
  });

  const userId = signUpRes.data?.user?.id;
  if (!userId) throw new Error('Sign up succeeded but no user ID returned');

  const roleRes = await apiClient.patch<IUser>(`/users/${userId}/role`, {
    role: dto.role,
  });

  return roleRes.data;
}

export async function getUsers(query?: IUsersQuery): Promise<IUsersResponse> {
  const res = await apiClient.get<IUsersResponse>('/users', { params: query });
  return res.data;
}

// ── NEW: Public advisers endpoint (no admin role required) ─────────────────
export async function getAdvisers(): Promise<IUsersResponse> {
  const res = await apiClient.get<IUsersResponse>('/users/advisers');
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