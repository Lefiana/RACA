// File: apps/frontend/lib/axios.ts
// Purpose: Single shared Axios instance for all API calls.
//          withCredentials: true sends the Better Auth session cookie automatically.
//          The 401 interceptor redirects to login when the session expires.
// Dependencies: axios, env

import axios from 'axios';
import { env } from '../../env';

export const apiClient = axios.create({
  baseURL:         env.apiUrl,
  withCredentials: true,       // required — Better Auth uses cookie-based sessions
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor — handles expired or missing sessions globally.
// On 401, redirect to /login so the user can re-authenticate.
// All other errors are re-thrown for the calling hook to handle.
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Only redirect if we're in the browser
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);