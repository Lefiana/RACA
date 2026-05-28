// File: apps/backend/test/e2e/auth.e2e-spec.ts
// Purpose: E2E tests for Better Auth sign-up, sign-in, sign-out, get-session.

import supertest from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootApp, closeApp }         from '../helpers/app.helper';
import { startTestDatabase, stopTestDatabase, truncateAllTables } from '../helpers/db.helper';

describe('Auth (e2e)', () => {
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

  const validUser = {
    email:    'auth-test@raca.test',
    password: 'Test1234!',
    name:     'Auth Test User',
  };

  describe('POST /api/auth/sign-up/email', () => {
    it('creates a new user and returns a session', async () => {
      const res = await agent
        .post('/api/auth/sign-up/email')
        .send(validUser)
        .expect(200);

      expect(res.body.user.email).toBe(validUser.email);
      expect(res.body.user.role).toBe('REQUESTOR');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('rejects duplicate email', async () => {
      await agent.post('/api/auth/sign-up/email').send(validUser);
      await agent
        .post('/api/auth/sign-up/email')
        .send(validUser)
        .expect(422);
    });

    it('rejects weak password', async () => {
      await agent
        .post('/api/auth/sign-up/email')
        .send({ ...validUser, password: '123' })
        .expect(422);
    });
  });

  describe('POST /api/auth/sign-in/email', () => {
    beforeEach(async () => {
      await agent.post('/api/auth/sign-up/email').send(validUser);
    });

    it('signs in with valid credentials', async () => {
      const res = await agent
        .post('/api/auth/sign-in/email')
        .send({ email: validUser.email, password: validUser.password })
        .expect(200);

      expect(res.body.user.email).toBe(validUser.email);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('rejects wrong password', async () => {
      await agent
        .post('/api/auth/sign-in/email')
        .send({ email: validUser.email, password: 'wrongpassword' })
        .expect(401);
    });

    it('rejects unknown email', async () => {
      await agent
        .post('/api/auth/sign-in/email')
        .send({ email: 'nobody@raca.test', password: 'Test1234!' })
        .expect(401);
    });
  });

  describe('GET /api/auth/get-session', () => {
    it('returns session for authenticated user', async () => {
      const signUp = await agent
        .post('/api/auth/sign-up/email')
        .send(validUser);

      const cookie = signUp.headers['set-cookie'];

      const res = await agent
        .get('/api/auth/get-session')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.user.email).toBe(validUser.email);
    });

    it('returns null without a session cookie', async () => {
      const res = await agent
        .get('/api/auth/get-session')
        .expect(200);

      expect(res.body.user).toBeUndefined();
    });
  });

  describe('POST /api/auth/sign-out', () => {
    it('clears the session', async () => {
      const signUp = await agent
        .post('/api/auth/sign-up/email')
        .send(validUser);

      const cookie = signUp.headers['set-cookie'];

      await agent
        .post('/api/auth/sign-out')
        .set('Cookie', cookie)
        .expect(200);
    });
  });
});