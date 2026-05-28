// File: apps/backend/test/e2e/system-config.e2e-spec.ts

import supertest from 'supertest';
import { INestApplication }     from '@nestjs/common';
import { bootApp, closeApp }    from '../helpers/app.helper';
import { startTestDatabase, stopTestDatabase, truncateAllTables } from '../helpers/db.helper';
import { createTestUser }       from '../helpers/auth.helper';

describe('SystemConfig (e2e)', () => {
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

  describe('POST /api/v1/system-config', () => {
    it('allows SUPER_ADMIN to upsert a config key', async () => {
      const admin = await createTestUser(agent, 'SUPER_ADMIN');

      const res = await agent
        .post('/api/v1/system-config')
        .set('Cookie', admin.cookie)
        .send({ key: 'test_key', value: '42', description: 'Test key' })
        .expect(200);

      expect(res.body.key).toBe('test_key');
      expect(res.body.value).toBe('42');
    });

    it('forbids SCHOOL_ADMIN from creating config', async () => {
      const admin = await createTestUser(agent, 'SCHOOL_ADMIN');

      await agent
        .post('/api/v1/system-config')
        .set('Cookie', admin.cookie)
        .send({ key: 'test_key', value: '42' })
        .expect(403);
    });

    it('is idempotent — upsert same key twice updates value', async () => {
      const admin = await createTestUser(agent, 'SUPER_ADMIN');

      await agent
        .post('/api/v1/system-config')
        .set('Cookie', admin.cookie)
        .send({ key: 'test_key', value: '42' })
        .expect(200);

      const res = await agent
        .post('/api/v1/system-config')
        .set('Cookie', admin.cookie)
        .send({ key: 'test_key', value: '99' })
        .expect(200);

      expect(res.body.value).toBe('99');
    });
  });

  describe('DELETE /api/v1/system-config/:key', () => {
    it('deletes a non-protected key', async () => {
      const admin = await createTestUser(agent, 'SUPER_ADMIN');

      await agent
        .post('/api/v1/system-config')
        .set('Cookie', admin.cookie)
        .send({ key: 'deletable_key', value: 'yes' })
        .expect(200);

      await agent
        .delete('/api/v1/system-config/deletable_key')
        .set('Cookie', admin.cookie)
        .expect(204);
    });

    it('blocks deletion of protected keys', async () => {
      const admin = await createTestUser(agent, 'SUPER_ADMIN');

      await agent
        .post('/api/v1/system-config')
        .set('Cookie', admin.cookie)
        .send({ key: 'reservation_buffer_min', value: '30' })
        .expect(200);

      const res = await agent
        .delete('/api/v1/system-config/reservation_buffer_min')
        .set('Cookie', admin.cookie)
        .expect(400);

      expect(res.body.message).toContain('protected');
    });
  });
});