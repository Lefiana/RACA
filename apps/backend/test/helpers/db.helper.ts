// File: apps/backend/test/helpers/db.helper.ts
// Purpose: Starts and stops the PostgreSQL Testcontainer.
//          Runs Prisma migrations against the container URL after startup.
//          Exports the container URL for use by the NestJS app and Prisma.
// Dependencies: @testcontainers/postgresql, child_process

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import * as path    from 'path';

let container: StartedPostgreSqlContainer | null = null;
let databaseUrl: string | null = null;

export async function startTestDatabase(): Promise<string> {
  console.log('[DB] Starting PostgreSQL container...');

  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('raca_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  databaseUrl = container.getConnectionUri();

  console.log(`[DB] Container started: ${databaseUrl}`);

  // Run Prisma migrations against the test container
  // prisma migrate deploy applies all existing migrations without prompts
  const schemaPath = path.resolve(
    __dirname,
    '../../../../packages/database/prisma/schema.prisma',
  );

  execSync(`npx prisma migrate deploy --schema="${schemaPath}"`, {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: 'inherit',
  });

  console.log('[DB] Migrations applied');

  // Set the env var so Prisma client picks it up when NestJS boots
  process.env.DATABASE_URL = databaseUrl;

  return databaseUrl;
}

export async function stopTestDatabase(): Promise<void> {
  if (container) {
    await container.stop();
    container    = null;
    databaseUrl  = null;
    console.log('[DB] Container stopped');
  }
}

export function getTestDatabaseUrl(): string {
  if (!databaseUrl) throw new Error('Test database not started');
  return databaseUrl;
}

// Truncates all app tables between tests — keeps schema, wipes data.
// Order matters: child tables before parents to satisfy FK constraints.
// TRUNCATE CASCADE handles the rest automatically.
export async function truncateAllTables(): Promise<void> {
  const { prisma } = await import('@repo/database');

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      audit_logs,
      notifications,
      attachments,
      asset_checkouts,
      assets,
      venue_bookings,
      approval_steps,
      requests,
      maintenance_logs,
      venues,
      system_configs,
      "session",
      account,
      verification,
      "user"
    RESTART IDENTITY CASCADE;
  `);
}