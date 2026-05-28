// File: apps/backend/test/e2e/venues.e2e-spec.ts

import supertest from 'supertest';
import { INestApplication }     from '@nestjs/common';
import { bootApp, closeApp }    from '../helpers/app.helper';
import { startTestDatabase, stopTestDatabase, truncateAllTables } from '../helpers/db.helper';
import { createTestUser }       from '../helpers/auth.helper';

describe('Venues (e2e)', () => {
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

  const venuePayload = {
    name:     'Multi Purpose Hall',
    capacity: 300,
    building: 'Main Building',
    floor:    '7th Floor',
    features: ['aircon', 'sound_system'],
  };

  describe('POST /api/v1/venues', () => {
    it('allows BUILDING_ADMIN to create a venue', async () => {
      const admin = await createTestUser(agent, 'BUILDING_ADMIN');

      const res = await agent
        .post('/api/v1/venues')
        .set('Cookie', admin.cookie)
        .send(venuePayload)
        .expect(201);

      expect(res.body.name).toBe(venuePayload.name);
      expect(res.body.status).toBe('AVAILABLE');
    });

    it('forbids REQUESTOR from creating venues', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');

      await agent
        .post('/api/v1/venues')
        .set('Cookie', user.cookie)
        .send(venuePayload)
        .expect(403);
    });

    it('rejects duplicate venue name', async () => {
      const admin = await createTestUser(agent, 'BUILDING_ADMIN');

      await agent
        .post('/api/v1/venues')
        .set('Cookie', admin.cookie)
        .send(venuePayload)
        .expect(201);

      await agent
        .post('/api/v1/venues')
        .set('Cookie', admin.cookie)
        .send(venuePayload)
        .expect(400);
    });
  });

  describe('GET /api/v1/venues', () => {
    it('returns paginated venues for any authenticated user', async () => {
      const admin = await createTestUser(agent, 'BUILDING_ADMIN');
      const user  = await createTestUser(agent, 'REQUESTOR');

      await agent
        .post('/api/v1/venues')
        .set('Cookie', admin.cookie)
        .send(venuePayload)
        .expect(201);

      const res = await agent
        .get('/api/v1/venues')
        .set('Cookie', user.cookie)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe('PATCH /api/v1/venues/:id/status', () => {
    it('sets venue to MAINTENANCE', async () => {
      const admin = await createTestUser(agent, 'BUILDING_ADMIN');

      const created = await agent
        .post('/api/v1/venues')
        .set('Cookie', admin.cookie)
        .send(venuePayload)
        .expect(201);

      const res = await agent
        .patch(`/api/v1/venues/${created.body.id}/status`)
        .set('Cookie', admin.cookie)
        .send({ status: 'MAINTENANCE', reason: 'Electrical work' })
        .expect(200);

      expect(res.body.status).toBe('MAINTENANCE');
    });
  });

  describe('DELETE /api/v1/venues/:id', () => {
    it('soft-deletes a venue', async () => {
      const admin = await createTestUser(agent, 'BUILDING_ADMIN');

      const created = await agent
        .post('/api/v1/venues')
        .set('Cookie', admin.cookie)
        .send(venuePayload)
        .expect(201);

      await agent
        .delete(`/api/v1/venues/${created.body.id}`)
        .set('Cookie', admin.cookie)
        .expect(204);

      await agent
        .get(`/api/v1/venues/${created.body.id}`)
        .set('Cookie', admin.cookie)
        .expect(404);
    });
  });
});