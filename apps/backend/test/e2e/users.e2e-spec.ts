// File: apps/backend/test/e2e/users.e2e-spec.ts
// Purpose: E2E tests for user management endpoints and role restrictions.

import supertest from 'supertest';
import { INestApplication }     from '@nestjs/common';
import { bootApp, closeApp }    from '../helpers/app.helper';
import { startTestDatabase, stopTestDatabase, truncateAllTables } from '../helpers/db.helper';
import { createTestUser }       from '../helpers/auth.helper';

describe('Users (e2e)', () => {
  let app:       INestApplication;
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

  describe('GET /api/v1/users/me', () => {
    it('returns the current user profile', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');

      const res = await agent
        .get('/api/v1/users/me')
        .set('Cookie', user.cookie)
        .expect(200);

      expect(res.body.email).toBe(user.email);
      expect(res.body.role).toBe('REQUESTOR');
    });

    it('returns 401 without session', async () => {
      await agent.get('/api/v1/users/me').expect(401);
    });
  });

  describe('GET /api/v1/users', () => {
    it('allows SUPER_ADMIN to list all users', async () => {
      const admin = await createTestUser(agent, 'SUPER_ADMIN');

      // Debug — check /me with same cookie first
      const meRes = await agent
        .get('/api/v1/users/me')
        .set('Cookie', admin.cookie);
      console.log('[DEBUG] /me status:', meRes.status, 'role:', meRes.body?.role);

      // Then try the role-restricted route
      const res = await agent
        .get('/api/v1/users')
        .set('Cookie', admin.cookie);
      console.log('[DEBUG] /users status:', res.status, 'body:', JSON.stringify(res.body));

      expect(res.status).toBe(200);
    });

    it('forbids REQUESTOR from listing users', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');

      await agent
        .get('/api/v1/users')
        .set('Cookie', user.cookie)
        .expect(403);
    });
  });

  describe('PATCH /api/v1/users/:id/role', () => {
    it('allows SUPER_ADMIN to update a role', async () => {
      const admin     = await createTestUser(agent, 'SUPER_ADMIN');
      const requestor = await createTestUser(agent, 'REQUESTOR');

      const res = await agent
        .patch(`/api/v1/users/${requestor.id}/role`)
        .set('Cookie', admin.cookie)
        .send({ role: 'ADVISER' })
        .expect(200);

      expect(res.body.role).toBe('ADVISER');
    });

    it('forbids non-SUPER_ADMIN from updating roles', async () => {
      const schoolAdmin = await createTestUser(agent, 'SCHOOL_ADMIN');
      const requestor   = await createTestUser(agent, 'REQUESTOR');

      await agent
        .patch(`/api/v1/users/${requestor.id}/role`)
        .set('Cookie', schoolAdmin.cookie)
        .send({ role: 'ADVISER' })
        .expect(403);
    });
  });

  describe('PATCH /api/v1/users/:id/toggle-active', () => {
    it('toggles user active status', async () => {
      const admin = await createTestUser(agent, 'SUPER_ADMIN');
      const user  = await createTestUser(agent, 'REQUESTOR');

      const res = await agent
        .patch(`/api/v1/users/${user.id}/toggle-active`)
        .set('Cookie', admin.cookie)
        .expect(200);

      expect(res.body.isActive).toBe(false);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('soft-deletes a user', async () => {
      const admin = await createTestUser(agent, 'SUPER_ADMIN');
      const user  = await createTestUser(agent, 'REQUESTOR');

      await agent
        .delete(`/api/v1/users/${user.id}`)
        .set('Cookie', admin.cookie)
        .expect(204);
    });
  });
});