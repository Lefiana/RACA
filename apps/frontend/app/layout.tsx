// File: apps/frontend/app/layout.tsx
// Purpose: Root layout — wraps the entire app with QueryProvider.
//          Metadata updated to reflect the RACA platform.
// Dependencies: QueryProvider, next/font

import type { Metadata } from 'next';
import { QueryProvider } from './lib/query-client';
import { EB_Garamond } from "next/font/google";
import './globals.css';

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-sans",
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
      <body className={ebGaramond.variable}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}