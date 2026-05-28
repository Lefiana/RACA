// File: apps/backend/test/e2e/approvals.e2e-spec.ts
// Purpose: E2E tests for the full 7-step approval chain.
//          Walks the entire chain from PENDING → APPROVED.

import supertest from 'supertest';
import { INestApplication }     from '@nestjs/common';
import { bootApp, closeApp }    from '../helpers/app.helper';
import { startTestDatabase, stopTestDatabase, truncateAllTables } from '../helpers/db.helper';
import { createTestUser }       from '../helpers/auth.helper';
import { seedSystemConfig }     from '../helpers/seed.helper';
import { prisma }               from '@repo/database';

const baseRequest = {
  activityTitle:   'Approval Chain Test',
  objectives:      'Walking the full approval chain',
  activityStartAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  activityEndAt:   new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
};

describe('Approvals (e2e)', () => {
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

  // Helper — submits a request and returns its id
  async function submitRequest(cookie: string): Promise<string> {
    const created = await agent
      .post('/api/v1/requests')
      .set('Cookie', cookie)
      .send(baseRequest)
      .expect(201);

    const submitted = await agent
      .post(`/api/v1/requests/${created.body.id}/submit`)
      .set('Cookie', cookie)
      .expect(200);

    return submitted.body.id;
  }

  // Helper — approves a step directly via DB-assigned approverId
  async function approveStep(
    stepId: string,
    cookie: string,
  ): Promise<void> {
    await agent
      .post(`/api/v1/approvals/${stepId}/approve`)
      .set('Cookie', cookie)
      .send({ remarks: 'Approved in test' })
      .expect(200);
  }

  describe('Full approval chain walk-through', () => {
    it('walks PENDING → APPROVED through all 7 steps', async () => {
      const requestor    = await createTestUser(agent, 'REQUESTOR');
      const adviser      = await createTestUser(agent, 'ADVISER');
      const deptHead     = await createTestUser(agent, 'DEPARTMENT_HEAD');
      const mis          = await createTestUser(agent, 'MIS');
      const building     = await createTestUser(agent, 'BUILDING_ADMIN');
      const studentAff   = await createTestUser(agent, 'STUDENT_AFFAIRS');
      const academicHead = await createTestUser(agent, 'ACADEMIC_HEAD');
      const schoolAdmin  = await createTestUser(agent, 'SCHOOL_ADMIN');

      const requestId = await submitRequest(requestor.cookie);

      // Assign approvers to steps directly in DB
      // (resolveApprovers picks the first user with the role — this ensures it)
      const steps = await prisma.approvalStep.findMany({
        where:   { requestId },
        orderBy: { stepOrder: 'asc' },
      });

      const stageMap: Record<string, string> = {
        STAGE_1_ADVISER:                 adviser.id,
        STAGE_1_DEPT_HEAD:               deptHead.id,
        STAGE_2_MIS:                     mis.id,
        STAGE_2_BUILDING:                building.id,
        STAGE_2_HEAD_OF_STUDENT_AFFAIRS: studentAff.id,
        STAGE_2_ACADEMIC_HEAD:           academicHead.id,
        STAGE_3_SCHOOL_ADMIN:            schoolAdmin.id,
      };

      for (const step of steps) {
        await prisma.approvalStep.update({
          where: { id: step.id },
          data:  { approverId: stageMap[step.stage] },
        });
      }

      // Stage 1 — Adviser
      await approveStep(steps[0].id, adviser.cookie);
      let req = await agent
        .get(`/api/v1/requests/${requestId}`)
        .set('Cookie', requestor.cookie)
        .expect(200);
      expect(req.body.status).toBe('STAGE1_REVIEW');

      // Stage 1 — Dept Head
      await approveStep(steps[1].id, deptHead.cookie);
      req = await agent
        .get(`/api/v1/requests/${requestId}`)
        .set('Cookie', requestor.cookie)
        .expect(200);
      expect(req.body.status).toBe('STAGE2_REVIEW');

      // Stage 2 — all four (parallel)
      await approveStep(steps[2].id, mis.cookie);
      await approveStep(steps[3].id, building.cookie);
      await approveStep(steps[4].id, studentAff.cookie);
      await approveStep(steps[5].id, academicHead.cookie);

      req = await agent
        .get(`/api/v1/requests/${requestId}`)
        .set('Cookie', requestor.cookie)
        .expect(200);
      expect(req.body.status).toBe('PENDING_FINAL');

      // Stage 3 — School Admin
      await approveStep(steps[6].id, schoolAdmin.cookie);

      req = await agent
        .get(`/api/v1/requests/${requestId}`)
        .set('Cookie', requestor.cookie)
        .expect(200);
      expect(req.body.status).toBe('APPROVED');
    });
  });

  describe('Rejection', () => {
    it('rejects at Stage 1 and terminates the chain', async () => {
      const requestor = await createTestUser(agent, 'REQUESTOR');
      const adviser   = await createTestUser(agent, 'ADVISER');

      const requestId = await submitRequest(requestor.cookie);

      const steps = await prisma.approvalStep.findMany({
        where:   { requestId },
        orderBy: { stepOrder: 'asc' },
      });

      await prisma.approvalStep.update({
        where: { id: steps[0].id },
        data:  { approverId: adviser.id },
      });

      await agent
        .post(`/api/v1/approvals/${steps[0].id}/reject`)
        .set('Cookie', adviser.cookie)
        .send({ rejectionReason: 'Not enough detail in the proposal.' })
        .expect(200);

      const req = await agent
        .get(`/api/v1/requests/${requestId}`)
        .set('Cookie', requestor.cookie)
        .expect(200);

      expect(req.body.status).toBe('REJECTED');

      // All remaining steps should be SKIPPED
      const remaining = req.body.approvalSteps.slice(1);
      expect(remaining.every((s: any) => s.status === 'SKIPPED')).toBe(true);
    });

    it('requires rejectionReason of at least 10 characters', async () => {
      const requestor = await createTestUser(agent, 'REQUESTOR');
      const adviser   = await createTestUser(agent, 'ADVISER');

      const requestId = await submitRequest(requestor.cookie);
      const steps     = await prisma.approvalStep.findMany({
        where: { requestId }, orderBy: { stepOrder: 'asc' },
      });

      await prisma.approvalStep.update({
        where: { id: steps[0].id },
        data:  { approverId: adviser.id },
      });

      await agent
        .post(`/api/v1/approvals/${steps[0].id}/reject`)
        .set('Cookie', adviser.cookie)
        .send({ rejectionReason: 'Too short' })
        .expect(400);
    });
  });
});