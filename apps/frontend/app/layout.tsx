// File: apps/frontend/app/layout.tsx
// Purpose: Root layout — wraps the entire app with QueryProvider.
//          Metadata updated to reflect the RACA platform.
// Dependencies: QueryProvider, next/font

import type { Metadata } from 'next';
import localFont         from 'next/font/local';
import { QueryProvider } from './lib/query-client';
import './globals.css';

const geistSans = localFont({
  src:      './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
});

const geistMono = localFont({
  src:      './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title:       'RACA Platform',
  description: 'Request for Approval of Campus Activity — STI Academic Center Cubao',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}