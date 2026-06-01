/// <reference types="jest" />
// File: apps/backend/test/e2e/auth.e2e-spec.ts
// Purpose: E2E tests for Better Auth sign-up, sign-in, sign-out, get-session.

import supertest           from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootApp, closeApp }                                        from '../helpers/app.helper';
import { startTestDatabase, stopTestDatabase, truncateAllTables }   from '../helpers/db.helper';

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
      await agent.post('/api/auth/sign-up/email').send(validUser).expect(200);

      const res = await agent
        .post('/api/auth/sign-up/email')
        .send(validUser);

      // Better Auth returns 422 for duplicate email
      expect([400, 409, 422]).toContain(res.status);
    });

    it('rejects weak password', async () => {
      const res = await agent
        .post('/api/auth/sign-up/email')
        .send({ ...validUser, email: 'weak@raca.test', password: '123' });

      // Better Auth returns 422 for password too short (min 8 chars)
      expect([400, 422]).toContain(res.status);
    });
  });

  describe('POST /api/auth/sign-in/email', () => {
    beforeEach(async () => {
      await agent.post('/api/auth/sign-up/email').send(validUser).expect(200);
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
      const res = await agent
        .post('/api/auth/sign-in/email')
        .send({ email: validUser.email, password: 'wrongpassword' });

      expect([400, 401, 422]).toContain(res.status);
    });

    it('rejects unknown email', async () => {
      const res = await agent
        .post('/api/auth/sign-in/email')
        .send({ email: 'nobody@raca.test', password: 'Test1234!' });

      expect([400, 401, 422]).toContain(res.status);
    });
  });

  describe('GET /api/auth/get-session', () => {
    it('returns session for authenticated user', async () => {
      const signUp = await agent
        .post('/api/auth/sign-up/email')
        .send(validUser)
        .expect(200);

      const cookie = signUp.headers['set-cookie'];

      const res = await agent
        .get('/api/auth/get-session')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.user.email).toBe(validUser.email);
    });

    it('returns null user without a session cookie', async () => {
      const res = await agent
        .get('/api/auth/get-session')
        .expect(200);

      // Better Auth returns 200 with null/undefined user when no session exists
      expect(res.body?.user).toBeUndefined();
    });
  });

  describe('POST /api/auth/sign-out', () => {
    it('clears the session', async () => {
      // Inside your sign-out test block:
      const signOutRes = await request(app.getHttpServer())
        .post('/api/auth/sign-out')
        .set('Cookie', authCookies) // Pass your logged-in cookies
        .expect(200);

      // Extract the deletion cookies sent back by Better Auth
      const loggedOutCookies = signOutRes.headers['set-cookie'];

      // Use those logged-out cookies for the verification check
      const sessionRes = await request(app.getHttpServer())
        .get('/api/auth/get-session')
        .set('Cookie', loggedOutCookies) // This tells the server to treat it as deleted
        .expect(200);

      expect(sessionRes.body).toBeNull();
    });
  });
});