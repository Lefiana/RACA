// File: apps/backend/test/e2e/requests.e2e-spec.ts
// Purpose: E2E tests for the full RACA request lifecycle.

import supertest from 'supertest';
import { INestApplication }     from '@nestjs/common';
import { bootApp, closeApp }    from '../helpers/app.helper';
import { startTestDatabase, stopTestDatabase, truncateAllTables } from '../helpers/db.helper';
import { createTestUser }       from '../helpers/auth.helper';
import { seedSystemConfig, seedVenue } from '../helpers/seed.helper';

const baseRequest = {
  activityTitle:   'Test Activity',
  objectives:      'Testing the request lifecycle end to end',
  activityStartAt: new Date(Date.now() + 7  * 24 * 60 * 60 * 1000).toISOString(),
  activityEndAt:   new Date(Date.now() + 7  * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
};

describe('Requests (e2e)', () => {
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
    await seedSystemConfig();
  });

  describe('POST /api/v1/requests', () => {
    it('creates a DRAFT request', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');

      const res = await agent
        .post('/api/v1/requests')
        .set('Cookie', user.cookie)
        .send(baseRequest)
        .expect(201);

      expect(res.body.status).toBe('DRAFT');
      expect(res.body.referenceNumber).toMatch(/^RACA-/);
      expect(res.body.requestedById).toBe(user.id);
    });

    it('returns 401 without session', async () => {
      await agent.post('/api/v1/requests').send(baseRequest).expect(401);
    });

    it('validates required fields', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');

      await agent
        .post('/api/v1/requests')
        .set('Cookie', user.cookie)
        .send({ activityTitle: 'Missing objectives' })
        .expect(400);
    });
  });

  describe('POST /api/v1/requests/:id/submit', () => {
    it('transitions DRAFT to PENDING and scaffolds 7 approval steps', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');

      const created = await agent
        .post('/api/v1/requests')
        .set('Cookie', user.cookie)
        .send(baseRequest)
        .expect(201);

      const res = await agent
        .post(`/api/v1/requests/${created.body.id}/submit`)
        .set('Cookie', user.cookie)
        .expect(200);

      expect(res.body.status).toBe('PENDING');
      expect(res.body.approvalSteps).toHaveLength(7);
    });

    it('rejects submit on non-DRAFT request', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');

      const created = await agent
        .post('/api/v1/requests')
        .set('Cookie', user.cookie)
        .send(baseRequest)
        .expect(201);

      // Submit once
      await agent
        .post(`/api/v1/requests/${created.body.id}/submit`)
        .set('Cookie', user.cookie)
        .expect(200);

      // Submit again — should fail
      await agent
        .post(`/api/v1/requests/${created.body.id}/submit`)
        .set('Cookie', user.cookie)
        .expect(400);
    });

    it('detects venue conflicts and rejects submit', async () => {
      const venue   = await seedVenue();
      const userA   = await createTestUser(agent, 'REQUESTOR');
      const userB   = await createTestUser(agent, 'REQUESTOR');
      const adviser = await createTestUser(agent, 'ADVISER');

      const requestWithVenue = {
        ...baseRequest,
        venues: [{ venueId: venue.id }],
      };

      // User A submits and gets through to PENDING (venue locked in stage 2)
      // For conflict detection we need an already-locked booking
      // so we create and submit request A first, then manually lock its booking
      const reqA = await agent
        .post('/api/v1/requests')
        .set('Cookie', userA.cookie)
        .send(requestWithVenue)
        .expect(201);

      await agent
        .post(`/api/v1/requests/${reqA.body.id}/submit`)
        .set('Cookie', userA.cookie)
        .expect(200);

      // Manually lock the venue booking to simulate stage 2 entry
      const { prisma } = await import('@repo/database');
      await prisma.venueBooking.updateMany({
        where: { requestId: reqA.body.id },
        data:  { isLocked: true },
      });

      // User B tries to submit with the same venue in the same window
      const reqB = await agent
        .post('/api/v1/requests')
        .set('Cookie', userB.cookie)
        .send(requestWithVenue)
        .expect(201);

      await agent
        .post(`/api/v1/requests/${reqB.body.id}/submit`)
        .set('Cookie', userB.cookie)
        .expect(400); // conflict detected
    });
  });

  describe('PATCH /api/v1/requests/:id', () => {
    it('updates a DRAFT request', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');

      const created = await agent
        .post('/api/v1/requests')
        .set('Cookie', user.cookie)
        .send(baseRequest)
        .expect(201);

      const res = await agent
        .patch(`/api/v1/requests/${created.body.id}`)
        .set('Cookie', user.cookie)
        .send({ activityTitle: 'Updated Title' })
        .expect(200);

      expect(res.body.activityTitle).toBe('Updated Title');
    });

    it('rejects edit from a different user', async () => {
      const owner = await createTestUser(agent, 'REQUESTOR');
      const other = await createTestUser(agent, 'REQUESTOR');

      const created = await agent
        .post('/api/v1/requests')
        .set('Cookie', owner.cookie)
        .send(baseRequest)
        .expect(201);

      await agent
        .patch(`/api/v1/requests/${created.body.id}`)
        .set('Cookie', other.cookie)
        .send({ activityTitle: 'Hijacked' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/requests/:id', () => {
    it('cancels a DRAFT request', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');

      const created = await agent
        .post('/api/v1/requests')
        .set('Cookie', user.cookie)
        .send(baseRequest)
        .expect(201);

      await agent
        .delete(`/api/v1/requests/${created.body.id}`)
        .set('Cookie', user.cookie)
        .expect(204);
    });
  });
});