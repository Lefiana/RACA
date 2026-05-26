// File: apps/frontend/lib/auth/api.ts
// Purpose: Auth API calls — sign in, sign up, sign out, get session.
//          Better Auth exposes these under /api/auth/* not /api/v1/*
//          so these calls use a separate base URL, not the apiClient instance.
// Dependencies: axios, env

import axios      from 'axios';
import { env }    from '../../../env';
import type { ISignInDto, ISignUpDto, ISession } from './types';

// Better Auth endpoints sit outside the /api/v1 prefix
// so we build a separate client pointing at the root
const authClient = axios.create({
  baseURL:         env.apiUrl.replace('/api/v1', ''),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export async function signIn(dto: ISignInDto): Promise<ISession> {
  const res = await authClient.post<ISession>(
    '/api/auth/sign-in/email',
    dto,
  );
  return res.data;
}

export async function signUp(dto: ISignUpDto): Promise<ISession> {
  const res = await authClient.post<ISession>(
    '/api/auth/sign-up/email',
    dto,
  );
  return res.data;
}

export async function signOut(): Promise<void> {
  await authClient.post('/api/auth/sign-out');
}

export async function getSession(): Promise<ISession | null> {
  try {
    const res = await authClient.get<ISession>('/api/auth/get-session');
    return res.data;
  } catch {
    // 401 means no active session — not an error worth throwing
    return null;
  }
}