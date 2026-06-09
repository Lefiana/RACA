// File: apps/frontend/app/page.tsx
// Purpose: Root route — redirects to dashboard if session exists, login if not
// Dependencies: next/navigation
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}