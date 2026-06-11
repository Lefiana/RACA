// File: apps/frontend/lib/auth/hooks.ts
// Purpose: TanStack Query hooks for auth state and mutations.
// Dependencies: @tanstack/react-query, auth/api

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter }                              from 'next/navigation';
import { getSession, signIn, signOut, signUp }    from './api';
import type { ISignInDto, ISignUpDto }            from './types';

// Query key — centralised so invalidations are consistent
export const authKeys = {
  session: ['auth', 'session'] as const,
};

// useSession — fetches the current Better Auth session.
// Used in layout/navbar to know who is logged in.
// staleTime is short — session state should stay fresh.
export function useSession() {
  return useQuery({
    queryKey: authKeys.session,
    queryFn:  getSession,
    staleTime: 60 * 1000,   // CHANGED: 60s — was 30s
    retry:     2,            // CHANGED: retry twice on null — was false
    retryDelay: 500,         // CHANGED: wait 500ms between retries
  });
}

// useSignIn — returns a mutation for the login form.
// On success, invalidates the session cache and redirects to dashboard.
export function useSignIn() {
  const queryClient = useQueryClient();
  const router      = useRouter();

  return useMutation({
    mutationFn: (dto: ISignInDto) => signIn(dto),
    onSuccess: async () => {
      // CHANGED: refetch immediately instead of just invalidating
      // ensures session is populated before redirect
      await queryClient.refetchQueries({ queryKey: authKeys.session });
      router.push('/dashboard');
    },
  });
}

// useSignUp — returns a mutation for the registration form.
// On success, redirects to dashboard (Better Auth signs in automatically on signup).
export function useSignUp() {
  const queryClient = useQueryClient();
  const router      = useRouter();

  return useMutation({
    mutationFn: (dto: ISignUpDto) => signUp(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.session });
      router.push('/dashboard');
    },
  });
}

// useSignOut — clears the session and redirects to login.
export function useSignOut() {
  const queryClient = useQueryClient();
  const router      = useRouter();

  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      // Clear entire query cache on sign out — no stale data from previous user
      queryClient.clear();
      router.push('/login');
    },
  });
}

// useCurrentUser — convenience hook that returns just the user object.
// Returns undefined while loading, null if no session.
export function useCurrentUser() {
  const { data, ...rest } = useSession();
  return { user: data?.user ?? null, ...rest };
}