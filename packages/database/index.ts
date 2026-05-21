// File: packages/database/index.ts
// Purpose: Shared database package barrel export.
//          All apps import from '@repo/database' — never from '@prisma/client' directly.

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Re-export everything from the generated Prisma client
// This includes all models, enums (UserRole, AssetCustodian, etc.),
// input types, and the Prisma namespace
export * from '@prisma/client';