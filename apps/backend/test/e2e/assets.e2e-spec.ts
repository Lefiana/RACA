// File: apps/backend/test/e2e/assets.e2e-spec.ts
// Purpose: E2E tests for asset inventory, checkout/return flow, and custodian scoping.

import supertest           from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootApp, closeApp }                                      from '../helpers/app.helper';
import { startTestDatabase, stopTestDatabase, truncateAllTables } from '../helpers/db.helper';
import { createTestUser }                                         from '../helpers/auth.helper';
import { seedAsset }                                              from '../helpers/seed.helper';

describe('Assets (e2e)', () => {
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

  const assetPayload = {
    assetTag:  'TEST-PRJ-001',
    name:      'Test Projector',
    category:  'Projector',
    brand:     'Epson',
    condition: 'GOOD',
  };

  describe('POST /api/v1/assets', () => {
    it('allows MIS to create an asset', async () => {
      const mis = await createTestUser(agent, 'MIS');

      const res = await agent
        .post('/api/v1/assets')
        .set('Cookie', mis.cookie)
        .send(assetPayload)
        .expect(201);

      expect(res.body.assetTag).toBe(assetPayload.assetTag);
      expect(res.body.status).toBe('AVAILABLE');
      expect(res.body.custodianRole).toBe('MIS');
    });

    it('allows BUILDING_ADMIN to create an asset scoped to their custodian', async () => {
      const admin = await createTestUser(agent, 'BUILDING_ADMIN');

      const res = await agent
        .post('/api/v1/assets')
        .set('Cookie', admin.cookie)
        .send({ ...assetPayload, assetTag: 'TEST-CHR-001', name: 'Test Chair' })
        .expect(201);

      expect(res.body.custodianRole).toBe('BUILDING_ADMIN');
    });

    it('forbids REQUESTOR from creating assets', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');

      await agent
        .post('/api/v1/assets')
        .set('Cookie', user.cookie)
        .send(assetPayload)
        .expect(403);
    });

    it('rejects duplicate asset tag', async () => {
      const mis = await createTestUser(agent, 'MIS');

      await agent
        .post('/api/v1/assets')
        .set('Cookie', mis.cookie)
        .send(assetPayload)
        .expect(201);

      await agent
        .post('/api/v1/assets')
        .set('Cookie', mis.cookie)
        .send(assetPayload)
        .expect(400);
    });
  });

  describe('GET /api/v1/assets', () => {
    it('returns paginated assets for MIS scoped to their custodian', async () => {
      const mis     = await createTestUser(agent, 'MIS');
      const building = await createTestUser(agent, 'BUILDING_ADMIN');

      // MIS creates an asset
      await agent
        .post('/api/v1/assets')
        .set('Cookie', mis.cookie)
        .send(assetPayload)
        .expect(201);

      // BUILDING_ADMIN creates a different asset
      await agent
        .post('/api/v1/assets')
        .set('Cookie', building.cookie)
        .send({ ...assetPayload, assetTag: 'BLDG-CHR-001', name: 'Chair' })
        .expect(201);

      // MIS should only see their own asset
      const res = await agent
        .get('/api/v1/assets')
        .set('Cookie', mis.cookie)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].custodianRole).toBe('MIS');
    });

    it('allows SUPER_ADMIN to see all assets', async () => {
      const admin   = await createTestUser(agent, 'SUPER_ADMIN');
      const mis     = await createTestUser(agent, 'MIS');
      const building = await createTestUser(agent, 'BUILDING_ADMIN');

      await agent.post('/api/v1/assets').set('Cookie', mis.cookie)
        .send(assetPayload).expect(201);
      await agent.post('/api/v1/assets').set('Cookie', building.cookie)
        .send({ ...assetPayload, assetTag: 'BLDG-001', name: 'Chair' }).expect(201);

      const res = await agent
        .get('/api/v1/assets')
        .set('Cookie', admin.cookie)
        .expect(200);

      expect(res.body.meta.total).toBe(2);
    });
  });

  describe('PATCH /api/v1/assets/:id/status', () => {
    it('sets asset status to MAINTENANCE', async () => {
      const mis = await createTestUser(agent, 'MIS');

      const created = await agent
        .post('/api/v1/assets')
        .set('Cookie', mis.cookie)
        .send(assetPayload)
        .expect(201);

      const res = await agent
        .patch(`/api/v1/assets/${created.body.id}/status`)
        .set('Cookie', mis.cookie)
        .send({ status: 'MAINTENANCE' })
        .expect(200);

      expect(res.body.status).toBe('MAINTENANCE');
    });

    it('forbids MIS from updating BUILDING_ADMIN assets', async () => {
      const mis     = await createTestUser(agent, 'MIS');
      const building = await createTestUser(agent, 'BUILDING_ADMIN');

      const created = await agent
        .post('/api/v1/assets')
        .set('Cookie', building.cookie)
        .send({ ...assetPayload, assetTag: 'BLDG-002', name: 'Chair 2' })
        .expect(201);

      await agent
        .patch(`/api/v1/assets/${created.body.id}/status`)
        .set('Cookie', mis.cookie)
        .send({ status: 'MAINTENANCE' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/assets/:id', () => {
    it('soft-deletes an asset', async () => {
      const mis = await createTestUser(agent, 'MIS');

      const created = await agent
        .post('/api/v1/assets')
        .set('Cookie', mis.cookie)
        .send(assetPayload)
        .expect(201);

      await agent
        .delete(`/api/v1/assets/${created.body.id}`)
        .set('Cookie', mis.cookie)
        .expect(204);

      await agent
        .get(`/api/v1/assets/${created.body.id}`)
        .set('Cookie', mis.cookie)
        .expect(404);
    });
  });

  describe('GET /api/v1/assets/checkouts/active', () => {
    it('returns active checkouts for the custodian', async () => {
      const mis = await createTestUser(agent, 'MIS');

      const res = await agent
        .get('/api/v1/assets/checkouts/active')
        .set('Cookie', mis.cookie)
        .expect(200);

      // No checkouts yet — should return empty array
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});