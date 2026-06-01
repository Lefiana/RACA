// File: apps/backend/test/e2e/notifications.e2e-spec.ts
// Purpose: E2E tests for the notification REST endpoints.
//          WebSocket delivery is not tested here — that requires a browser client.

import supertest            from 'supertest';
import { INestApplication } from '@nestjs/common';
import { prisma }           from '@repo/database';
import { bootApp, closeApp }                                      from '../helpers/app.helper';
import { startTestDatabase, stopTestDatabase, truncateAllTables } from '../helpers/db.helper';
import { createTestUser }                                         from '../helpers/auth.helper';

describe('Notifications (e2e)', () => {
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
  });

  // Helper — seeds notifications directly via Prisma for a given user
  async function seedNotifications(userId: string, count: number, readCount = 0) {
    for (let i = 0; i < count; i++) {
      await prisma.notification.create({
        data: {
          userId,
          type:   'SYSTEM',
          title:  `Test notification ${i + 1}`,
          body:   `Body for notification ${i + 1}`,
          isRead: i < readCount,
          readAt: i < readCount ? new Date() : null,
        },
      });
    }
  }

  describe('GET /api/v1/notifications', () => {
    it('returns paginated notifications for the current user', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');
      await seedNotifications(user.id, 5);

      const res = await agent
        .get('/api/v1/notifications')
        .set('Cookie', user.cookie)
        .expect(200);

      expect(res.body.data.length).toBe(5);
      expect(res.body.meta.total).toBe(5);
    });

    it('returns only unread when unreadOnly=true', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');
      // 5 total, 2 already read
      await seedNotifications(user.id, 5, 2);

      const res = await agent
        .get('/api/v1/notifications')
        .query({ unreadOnly: true })
        .set('Cookie', user.cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(3);
      expect(res.body.data.every((n: any) => !n.isRead)).toBe(true);
    });

    it('does not return another user\'s notifications', async () => {
      const userA = await createTestUser(agent, 'REQUESTOR');
      const userB = await createTestUser(agent, 'REQUESTOR');

      await seedNotifications(userA.id, 3);

      const res = await agent
        .get('/api/v1/notifications')
        .set('Cookie', userB.cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(0);
    });

    it('returns 401 without session', async () => {
      await agent.get('/api/v1/notifications').expect(401);
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('returns correct unread count', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');
      await seedNotifications(user.id, 5, 2); // 5 total, 2 read → 3 unread

      const res = await agent
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', user.cookie)
        .expect(200);

      expect(res.body.count).toBe(3);
    });

    it('returns 0 when all are read', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');
      await seedNotifications(user.id, 3, 3); // all read

      const res = await agent
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', user.cookie)
        .expect(200);

      expect(res.body.count).toBe(0);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('marks a single notification as read', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');
      await seedNotifications(user.id, 1);

      const listRes = await agent
        .get('/api/v1/notifications')
        .set('Cookie', user.cookie)
        .expect(200);

      const notifId = listRes.body.data[0].id;

      const res = await agent
        .patch(`/api/v1/notifications/${notifId}/read`)
        .set('Cookie', user.cookie)
        .expect(200);

      expect(res.body.isRead).toBe(true);
      expect(res.body.readAt).not.toBeNull();
    });

    it('forbids marking another user\'s notification as read', async () => {
      const userA = await createTestUser(agent, 'REQUESTOR');
      const userB = await createTestUser(agent, 'REQUESTOR');

      await seedNotifications(userA.id, 1);

      const listRes = await agent
        .get('/api/v1/notifications')
        .set('Cookie', userA.cookie)
        .expect(200);

      const notifId = listRes.body.data[0].id;

      await agent
        .patch(`/api/v1/notifications/${notifId}/read`)
        .set('Cookie', userB.cookie)
        .expect(403);
    });
  });

  describe('PATCH /api/v1/notifications/read-all', () => {
    it('marks all notifications as read', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');
      await seedNotifications(user.id, 5); // all unread

      await agent
        .patch('/api/v1/notifications/read-all')
        .set('Cookie', user.cookie)
        .expect(200);

      const countRes = await agent
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', user.cookie)
        .expect(200);

      expect(countRes.body.count).toBe(0);
    });

    it('only marks the current user\'s notifications as read', async () => {
      const userA = await createTestUser(agent, 'REQUESTOR');
      const userB = await createTestUser(agent, 'REQUESTOR');

      await seedNotifications(userA.id, 3);
      await seedNotifications(userB.id, 3);

      // Only mark userA's as read
      await agent
        .patch('/api/v1/notifications/read-all')
        .set('Cookie', userA.cookie)
        .expect(200);

      // userB's should still be unread
      const countRes = await agent
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', userB.cookie)
        .expect(200);

      expect(countRes.body.count).toBe(3);
    });
  });
});