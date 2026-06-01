// File: apps/backend/test/e2e/audit-logs.e2e-spec.ts
// Purpose: E2E tests for audit log read-only endpoints and access control.

import supertest            from 'supertest';
import { INestApplication } from '@nestjs/common';
import { prisma }           from '@repo/database';
import { bootApp, closeApp }                                      from '../helpers/app.helper';
import { startTestDatabase, stopTestDatabase, truncateAllTables } from '../helpers/db.helper';
import { createTestUser }                                         from '../helpers/auth.helper';
import { seedSystemConfig }                                       from '../helpers/seed.helper';

describe('AuditLogs (e2e)', () => {
  let app:   INestApplication;
  let agent: any;

  beforeAll(async () => {
    await startTestDatabase();
    ({ app, agent } = await bootApp());
  });

  afterAll(async () => {
    await closeApp();
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await truncateAllTables();
    await seedSystemConfig();
  });

  // Helper — seeds audit log entries directly via Prisma
  async function seedAuditLogs(performedById: string, count: number) {
    for (let i = 0; i < count; i++) {
      await prisma.auditLog.create({
        data: {
          performedById,
          action:   `TEST_ACTION_${i}`,
          entity:   'Request',
          entityId: `test-entity-${i}`,
          snapshot: { test: true },
        },
      });
    }
  }

  describe('GET /api/v1/audit-logs', () => {
    it('allows SUPER_ADMIN to list all audit logs', async () => {
      const admin = await createTestUser(agent, 'SUPER_ADMIN');
      const user  = await createTestUser(agent, 'REQUESTOR');

      await seedAuditLogs(user.id, 3);

      const res = await agent
        .get('/api/v1/audit-logs')
        .set('Cookie', admin.cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(3);
      expect(res.body.data[0].action).toContain('TEST_ACTION');
    });

    it('allows SCHOOL_ADMIN to list audit logs', async () => {
      const schoolAdmin = await createTestUser(agent, 'SCHOOL_ADMIN');
      const user        = await createTestUser(agent, 'REQUESTOR');

      await seedAuditLogs(user.id, 2);

      const res = await agent
        .get('/api/v1/audit-logs')
        .set('Cookie', schoolAdmin.cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(2);
    });

    it('forbids REQUESTOR from accessing audit logs', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');

      await agent
        .get('/api/v1/audit-logs')
        .set('Cookie', user.cookie)
        .expect(403);
    });

    it('forbids ADVISER from accessing audit logs', async () => {
      const adviser = await createTestUser(agent, 'ADVISER');

      await agent
        .get('/api/v1/audit-logs')
        .set('Cookie', adviser.cookie)
        .expect(403);
    });

    it('returns 401 without session', async () => {
      await agent.get('/api/v1/audit-logs').expect(401);
    });

    it('supports pagination', async () => {
      const admin = await createTestUser(agent, 'SUPER_ADMIN');
      await seedAuditLogs(admin.id, 15);

      const res = await agent
        .get('/api/v1/audit-logs')
        .query({ page: 1, limit: 5 })
        .set('Cookie', admin.cookie)
        .expect(200);

      expect(res.body.data.length).toBe(5);
      expect(res.body.meta.total).toBe(15);
      expect(res.body.meta.totalPages).toBe(3);
      expect(res.body.meta.hasNextPage).toBe(true);
    });

    it('filters by action', async () => {
      const admin = await createTestUser(agent, 'SUPER_ADMIN');
      await seedAuditLogs(admin.id, 3);

      // Seed one with a specific action
      await prisma.auditLog.create({
        data: {
          performedById: admin.id,
          action:        'REQUEST_APPROVED',
          entity:        'Request',
          entityId:      'specific-id',
          snapshot:      {},
        },
      });

      const res = await agent
        .get('/api/v1/audit-logs')
        .query({ action: 'REQUEST_APPROVED' })
        .set('Cookie', admin.cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0].action).toBe('REQUEST_APPROVED');
    });

    it('filters by userId', async () => {
      const admin  = await createTestUser(agent, 'SUPER_ADMIN');
      const userA  = await createTestUser(agent, 'REQUESTOR');
      const userB  = await createTestUser(agent, 'REQUESTOR');

      await seedAuditLogs(userA.id, 2);
      await seedAuditLogs(userB.id, 3);

      const res = await agent
        .get('/api/v1/audit-logs')
        .query({ userId: userA.id })
        .set('Cookie', admin.cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(2);
    });
  });

  describe('GET /api/v1/audit-logs/:id', () => {
    it('returns a single audit log entry', async () => {
      const admin = await createTestUser(agent, 'SUPER_ADMIN');

      const log = await prisma.auditLog.create({
        data: {
          performedById: admin.id,
          action:        'REQUEST_CREATED',
          entity:        'Request',
          entityId:      'some-request-id',
          snapshot:      { referenceNumber: 'RACA-001' },
        },
      });

      const res = await agent
        .get(`/api/v1/audit-logs/${log.id}`)
        .set('Cookie', admin.cookie)
        .expect(200);

      expect(res.body.id).toBe(log.id);
      expect(res.body.action).toBe('REQUEST_CREATED');
      expect(res.body.snapshot).toEqual({ referenceNumber: 'RACA-001' });
    });

    it('returns 404 for non-existent log entry', async () => {
      const admin = await createTestUser(agent, 'SUPER_ADMIN');

      await agent
        .get('/api/v1/audit-logs/nonexistent-id')
        .set('Cookie', admin.cookie)
        .expect(404);
    });
  });

  describe('GET /api/v1/audit-logs/request/:requestId', () => {
    it('returns full chronological audit trail for a request', async () => {
      const admin     = await createTestUser(agent, 'SUPER_ADMIN');
      const requestor = await createTestUser(agent, 'REQUESTOR');

      // Create a real request so we have a valid requestId
      await seedSystemConfig();
      const requestRes = await agent
        .post('/api/v1/requests')
        .set('Cookie', requestor.cookie)
        .send({
          activityTitle:   'Audit Trail Test',
          objectives:      'Testing the audit trail endpoint',
          activityStartAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          activityEndAt:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
        })
        .expect(201);

      const requestId = requestRes.body.id;

      // Seed some audit log entries for this request
      await prisma.auditLog.createMany({
        data: [
          {
            performedById: requestor.id,
            requestId,
            action:   'REQUEST_CREATED',
            entity:   'Request',
            entityId: requestId,
            snapshot: {},
          },
          {
            performedById: requestor.id,
            requestId,
            action:   'REQUEST_SUBMITTED',
            entity:   'Request',
            entityId: requestId,
            snapshot: {},
          },
        ],
      });

      const res = await agent
        .get(`/api/v1/audit-logs/request/${requestId}`)
        .set('Cookie', admin.cookie)
        .expect(200);

      // Should return at least our 2 seeded entries in chronological order
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      // Verify chronological order
      const timestamps = res.body.map((l: any) => new Date(l.createdAt).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    it('forbids REQUESTOR from accessing the audit trail endpoint', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');

      await agent
        .get('/api/v1/audit-logs/request/some-request-id')
        .set('Cookie', user.cookie)
        .expect(403);
    });
  });
});