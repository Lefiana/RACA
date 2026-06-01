// File: apps/backend/test/e2e/attachments.e2e-spec.ts
// Purpose: E2E tests for file upload, list, download, and delete.

import supertest            from 'supertest';
import { INestApplication } from '@nestjs/common';
import * as path            from 'path';
import * as fs              from 'fs';
import { bootApp, closeApp }                                      from '../helpers/app.helper';
import { startTestDatabase, stopTestDatabase, truncateAllTables } from '../helpers/db.helper';
import { createTestUser }                                         from '../helpers/auth.helper';
import { seedSystemConfig }                                       from '../helpers/seed.helper';

const baseRequest = {
  activityTitle:   'Attachment Test Activity',
  objectives:      'Testing file attachment upload and retrieval',
  activityStartAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  activityEndAt:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
};

// Creates a minimal valid PDF buffer for upload testing
function createTestPdfBuffer(): Buffer {
  return Buffer.from('%PDF-1.4 test pdf content');
}

describe('Attachments (e2e)', () => {
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

  // Helper — creates a request and returns its id
  async function createRequest(cookie: string): Promise<string> {
    const res = await agent
      .post('/api/v1/requests')
      .set('Cookie', cookie)
      .send(baseRequest)
      .expect(201);
    return res.body.id;
  }

  describe('POST /api/v1/attachments/request/:requestId', () => {
    it('allows requestor to upload a file to their request', async () => {
      const user      = await createTestUser(agent, 'REQUESTOR');
      const requestId = await createRequest(user.cookie);

      const res = await agent
        .post(`/api/v1/attachments/request/${requestId}`)
        .set('Cookie', user.cookie)
        .attach('file', createTestPdfBuffer(), {
          filename:    'test-document.pdf',
          contentType: 'application/pdf',
        })
        .field('label', 'Proposed Program')
        .expect(201);

      expect(res.body.originalName).toBe('test-document.pdf');
      expect(res.body.label).toBe('Proposed Program');
      expect(res.body.requestId).toBe(requestId);
    });

    it('forbids uploading to another user\'s request', async () => {
      const owner = await createTestUser(agent, 'REQUESTOR');
      const other = await createTestUser(agent, 'REQUESTOR');

      const requestId = await createRequest(owner.cookie);

      await agent
        .post(`/api/v1/attachments/request/${requestId}`)
        .set('Cookie', other.cookie)
        .attach('file', createTestPdfBuffer(), {
          filename:    'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(403);
    });

    it('returns 404 for non-existent request', async () => {
      const user = await createTestUser(agent, 'REQUESTOR');

      await agent
        .post('/api/v1/attachments/request/nonexistent-id')
        .set('Cookie', user.cookie)
        .attach('file', createTestPdfBuffer(), {
          filename:    'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(404);
    });
  });

  describe('GET /api/v1/attachments/request/:requestId', () => {
    it('lists all attachments for a request', async () => {
      const user      = await createTestUser(agent, 'REQUESTOR');
      const requestId = await createRequest(user.cookie);

      // Upload two files
      await agent
        .post(`/api/v1/attachments/request/${requestId}`)
        .set('Cookie', user.cookie)
        .attach('file', createTestPdfBuffer(), {
          filename: 'doc1.pdf', contentType: 'application/pdf',
        });

      await agent
        .post(`/api/v1/attachments/request/${requestId}`)
        .set('Cookie', user.cookie)
        .attach('file', createTestPdfBuffer(), {
          filename: 'doc2.pdf', contentType: 'application/pdf',
        });

      const res = await agent
        .get(`/api/v1/attachments/request/${requestId}`)
        .set('Cookie', user.cookie)
        .expect(200);

      expect(res.body.length).toBe(2);
    });

    it('filters by label when provided', async () => {
      const user      = await createTestUser(agent, 'REQUESTOR');
      const requestId = await createRequest(user.cookie);

      await agent
        .post(`/api/v1/attachments/request/${requestId}`)
        .set('Cookie', user.cookie)
        .attach('file', createTestPdfBuffer(), {
          filename: 'program.pdf', contentType: 'application/pdf',
        })
        .field('label', 'Proposed Program');

      await agent
        .post(`/api/v1/attachments/request/${requestId}`)
        .set('Cookie', user.cookie)
        .attach('file', createTestPdfBuffer(), {
          filename: 'budget.pdf', contentType: 'application/pdf',
        })
        .field('label', 'Budget Proposal');

      const res = await agent
        .get(`/api/v1/attachments/request/${requestId}`)
        .query({ label: 'Proposed Program' })
        .set('Cookie', user.cookie)
        .expect(200);

      expect(res.body.length).toBe(1);
      expect(res.body[0].label).toBe('Proposed Program');
    });
  });

  describe('DELETE /api/v1/attachments/:id', () => {
    it('allows uploader to delete their attachment', async () => {
      const user      = await createTestUser(agent, 'REQUESTOR');
      const requestId = await createRequest(user.cookie);

      const uploaded = await agent
        .post(`/api/v1/attachments/request/${requestId}`)
        .set('Cookie', user.cookie)
        .attach('file', createTestPdfBuffer(), {
          filename: 'to-delete.pdf', contentType: 'application/pdf',
        })
        .expect(201);

      await agent
        .delete(`/api/v1/attachments/${uploaded.body.id}`)
        .set('Cookie', user.cookie)
        .expect(204);
    });

    it('forbids deleting another user\'s attachment', async () => {
      const owner = await createTestUser(agent, 'REQUESTOR');
      const other = await createTestUser(agent, 'REQUESTOR');

      const requestId = await createRequest(owner.cookie);

      const uploaded = await agent
        .post(`/api/v1/attachments/request/${requestId}`)
        .set('Cookie', owner.cookie)
        .attach('file', createTestPdfBuffer(), {
          filename: 'protected.pdf', contentType: 'application/pdf',
        })
        .expect(201);

      await agent
        .delete(`/api/v1/attachments/${uploaded.body.id}`)
        .set('Cookie', other.cookie)
        .expect(403);
    });
  });
});