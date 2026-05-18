// File: apps/api/src/auth.ts
// Purpose: Creates and exports the single Better Auth instance.
//          This file is imported by auth.module.ts and used by the
//          @thallesp/nestjs-better-auth integration.
//          Keep this file free of NestJS decorators — it must be resolvable
//          by the Better Auth CLI independently of the NestJS bootstrap.
// Dependencies: better-auth, better-auth/adapters/prisma, @repo/database

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@repo/database';

export const auth = betterAuth({
  // ── Base path ─────────────────────────────────────────────────────────────
  // Better Auth handles all routes under /api/auth/*.
  // main.ts excludes this prefix from the NestJS global prefix.
  basePath: '/api/auth',

  // ── Database ──────────────────────────────────────────────────────────────
  // Uses the shared prisma instance from packages/database.
  // Better Auth reads/writes user, session, account, verification tables.
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // ── Secret ────────────────────────────────────────────────────────────────
  // Signs session tokens. Must be ≥32 chars.
  // Generate: openssl rand -base64 32
  secret: process.env.BETTER_AUTH_SECRET,

  // ── Email & Password ──────────────────────────────────────────────────────
  // Better Auth handles hashing internally (scrypt).
  // We never touch passwords in application code.
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Disabled until SMTP is configured.
    // Flip to true and add an emailVerification config block when ready.
    requireEmailVerification: false,
  },

  // ── Session ───────────────────────────────────────────────────────────────
  session: {
    expiresIn:  60 * 60 * 24 * 7,  // 7 days
    updateAge:  60 * 60 * 24,       // refresh expiry if active within 24h
    cookieCache: {
      enabled: true,
      maxAge:  60 * 5,              // 5-minute client-side cache
    },
  },

  // ── User additional fields ────────────────────────────────────────────────
  // These fields sit on the user table alongside Better Auth's core fields.
  // Better Auth will include them in session responses and allow them
  // to be set during sign-up via additionalFields.
  user: {
    additionalFields: {
      username: {
        type:     'string',
        required: false,
        unique:   true,
        input:    true,   // accepted from the sign-up payload
      },
      role: {
        type:         'string',
        required:     false,
        defaultValue: 'REQUESTOR',
        input:        false,  // never set by the client — only by server hooks
      },
      department: {
        type:     'string',
        required: false,
        input:    true,
      },
      isActive: {
        type:         'boolean',
        required:     false,
        defaultValue: true,
        input:        false, // never set by the client
      },
    },
  },

  // ── Trusted origins ───────────────────────────────────────────────────────
  trustedOrigins: [
    process.env.FRONTEND_URL ?? 'http://localhost:6000',
  ],

  // ── Advanced ─────────────────────────────────────────────────────────────
  advanced: {
    useSecureCookies:   process.env.NODE_ENV === 'production',
    disableOriginCheck: process.env.NODE_ENV !== 'production',
  },

  // ── Hooks ─────────────────────────────────────────────────────────────────
  // Empty objects are required by @thallesp/nestjs-better-auth as signals
  // that each hook category is active. The actual logic lives in NestJS
  // @Hook() / @DatabaseHook() classes registered in auth.module.ts.
  hooks: {},
  databaseHooks: {},

  // ── Microsoft Entra ID ────────────────────────────────────────────────────
  // Uncomment when Entra ID credentials are available.
  // socialProviders: {
  //   microsoft: {
  //     clientId:     process.env.MICROSOFT_CLIENT_ID as string,
  //     clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
  //     tenantId:     process.env.MICROSOFT_TENANT_ID ?? 'common',
  //   },
  // },
});

export type Auth = typeof auth;