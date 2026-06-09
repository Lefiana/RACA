// File: apps/backend/src/auth.ts
// CHANGED: import PrismaClient from @repo/database, not @prisma/client directly
import { betterAuth }    from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient }  from '@repo/database';

// CHANGED: dedicated instance for Better Auth to avoid singleton init order issues
const authPrisma = new PrismaClient();

export const auth = betterAuth({
  basePath: '/api/auth',

  database: prismaAdapter(authPrisma, {
    provider: 'postgresql',
  }),

  secret: process.env.BETTER_AUTH_SECRET,

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
  },

  session: {
    expiresIn:   60 * 60 * 24 * 7,
    updateAge:   60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge:  60 * 5,
    },
  },

  user: {
    additionalFields: {
      username: {
        type:     'string',
        required: false,
        unique:   true,
        input:    true,
      },
      role: {
        type:         'string',
        required:     false,
        defaultValue: 'REQUESTOR',
        input:        false,
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
        input:        false,
      },
    },
  },

  trustedOrigins: [
    process.env.FRONTEND_URL ?? 'http://localhost:60000',
  ],

  advanced: {
    useSecureCookies:   process.env.NODE_ENV === 'production',
    disableOriginCheck: process.env.NODE_ENV !== 'production',
    disableCSRFCheck:   process.env.NODE_ENV !== 'production',
  },

  hooks: {},
  databaseHooks: {},
});

export type Auth = typeof auth;