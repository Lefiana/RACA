// File: apps/frontend/env.ts
// Purpose: Type-safe access to environment variables.
//          Import from here instead of process.env directly anywhere in the app.

export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:60001/api/v1',
  wsUrl:  process.env.NEXT_PUBLIC_WS_URL  ?? 'http://localhost:60001',
} as const;