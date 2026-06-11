// File: apps/frontend/app/lib/users/api.ts
// CHANGED: createUser signs up with withCredentials: false to prevent session overriding, then assigns role

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
  // Step 1: Create account via Better Auth  
  // NOTE: this does NOT override the current session because we use  
  // a fresh axios instance without withCredentials for this call  
  const authClient = axios.create({
    baseURL: env.apiUrl.replace('/api/v1', ''),
    // CHANGED: no withCredentials — prevents new user session from  
    // overwriting the current super admin session cookie  
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

  // Step 2: Assign role — this uses the super admin session (apiClient)  
  const roleRes = await apiClient.patch<IUser>(`/users/${userId}/role`, {
    role: dto.role,
  });

  return roleRes.data;
}

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