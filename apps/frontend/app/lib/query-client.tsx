// File: apps/frontend/lib/query-client.tsx
// Purpose: TanStack Query client configuration and provider component.
//          Wrapped around the app in the root layout.
//          ReactQueryDevtools is included in dev only — tree-shaken in production.
// Dependencies: @tanstack/react-query, @tanstack/react-query-devtools

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools }               from '@tanstack/react-query-devtools';
import { useState }                         from 'react';

// Factory function — creates a new QueryClient per request on the server,
// or once per browser session on the client.
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 60 seconds before a background refetch
        staleTime:            60 * 1000,
        // Keep cached data for 5 minutes after the last subscriber unmounts
        gcTime:               5 * 60 * 1000,
        // Don't retry on 4xx errors — they're not transient
        retry: (failureCount, error: any) => {
          if (error?.response?.status >= 400 && error?.response?.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}

// Module-level singleton — reused across re-renders in the browser
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server — always create a new client
    return makeQueryClient();
  }
  // Browser — reuse the same client
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState ensures the client is stable across re-renders
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}