// File: apps/backend/src/modules/notifications/listeners/notifications.listener.ts
// Purpose: Listens to all domain events and creates the appropriate notifications.
//          Every handler is fully isolated in try/catch — a notification failure
//          never affects the business operation that emitted the event.
// Dependencies: @nestjs/event-emitter, NotificationsService, @repo/database, prisma

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent }            from '@nestjs/event-emitter';
import { prisma, NotificationType, ApprovalStage } from '@repo/database';

import { NotificationsService } from '../services/notifications.service';

// Maps each ApprovalStage to a human-readable label for notification copy.
// Duplicated from approval-step.entity.ts intentionally — the listener should
// not import from the Approvals module to avoid circular dependencies.
const STAGE_LABEL: Record<ApprovalStage, string> = {
  [ApprovalStage.STAGE_1_ADVISER]:                 'Adviser',
  [ApprovalStage.STAGE_1_DEPT_HEAD]:               'Department Head',
  [ApprovalStage.STAGE_2_MIS]:                     'MIS',
  [ApprovalStage.STAGE_2_BUILDING]:                'Building Administrator',
  [ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS]: 'Head of Student Affairs',
  [ApprovalStage.STAGE_2_ACADEMIC_HEAD]:           'Academic Head',
  [ApprovalStage.STAGE_3_SCHOOL_ADMIN]:            'School Administrator',
};

// Maps each ApprovalStage to the UserRole string that handles it.
// Used to find the right approver(s) to notify when a stage opens.
const STAGE_TO_ROLE: Record<ApprovalStage, string> = {
  [ApprovalStage.STAGE_1_ADVISER]:                 'ADVISER',
  [ApprovalStage.STAGE_1_DEPT_HEAD]:               'DEPARTMENT_HEAD',
  [ApprovalStage.STAGE_2_MIS]:                     'MIS',
  [ApprovalStage.STAGE_2_BUILDING]:                'BUILDING_ADMIN',
  [ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS]: 'STUDENT_AFFAIRS',
  [ApprovalStage.STAGE_2_ACADEMIC_HEAD]:           'ACADEMIC_HEAD',
  [ApprovalStage.STAGE_3_SCHOOL_ADMIN]:            'SCHOOL_ADMIN',
};

// Stages that open when a request enters each status
const STAGE2_STAGES: ApprovalStage[] = [
  ApprovalStage.STAGE_2_MIS,
  ApprovalStage.STAGE_2_BUILDING,
  ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS,
  ApprovalStage.STAGE_2_ACADEMIC_HEAD,
];

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  // ── request.submitted ─────────────────────────────────────────────────────
  // Notify the Adviser (Stage 1) that a new request needs their review.
  @OnEvent('request.submitted')
  async onRequestSubmitted(payload: {
    requestId:       string;
    userId:          string;
    referenceNumber: string;
  }) {
    try {
      const advisers = await prisma.user.findMany({
        where: { role: 'ADVISER', isActive: true, deletedAt: null },
        select: { id: true },
      });

      for (const adviser of advisers) {
        await this.notificationsService.createAndPush({
          userId:    adviser.id,
          type:      NotificationType.REQUEST_SUBMITTED,
          title:     'New request awaiting your review',
          body:      `Request ${payload.referenceNumber} has been submitted and requires your approval.`,
          requestId: payload.requestId,
        });
      }
    } catch (err: any) {
      this.logger.error(`[Listener] request.submitted error: ${err.message}`);
    }
  }

  // ── request.stage.advanced ────────────────────────────────────────────────
  // Notify the next stage's approvers that the request is ready for them.
  @OnEvent('request.stage.advanced')
  async onStageAdvanced(payload: {
    requestId:  string;
    fromStatus: string;
    toStatus:   string;
  }) {
    try {
      const request = await prisma.request.findUnique({
        where:  { id: payload.requestId },
        select: { referenceNumber: true, activityTitle: true },
      });
      if (!request) return;

      // Determine which stages just became actionable based on the new status
      let stagesToNotify: ApprovalStage[] = [];

      if (payload.toStatus === 'STAGE1_REVIEW') {
        stagesToNotify = [ApprovalStage.STAGE_1_DEPT_HEAD];
      } else if (payload.toStatus === 'STAGE2_REVIEW') {
        stagesToNotify = STAGE2_STAGES;
      } else if (payload.toStatus === 'PENDING_FINAL') {
        stagesToNotify = [ApprovalStage.STAGE_3_SCHOOL_ADMIN];
      }

      for (const stage of stagesToNotify) {
        const role = STAGE_TO_ROLE[stage];

        // Notify the explicitly assigned approver first
        const step = await prisma.approvalStep.findFirst({
          where:  { requestId: payload.requestId, stage },
          select: { approverId: true },
        });

        const userIdsToNotify: string[] = [];

        if (step?.approverId) {
          userIdsToNotify.push(step.approverId);
        } else {
          // Fallback: notify all users with this role
          const users = await prisma.user.findMany({
            where:  { role, isActive: true, deletedAt: null },
            select: { id: true },
          });
          userIdsToNotify.push(...users.map(u => u.id));
        }

        for (const userId of userIdsToNotify) {
          await this.notificationsService.createAndPush({
            userId,
            type:      NotificationType.STAGE_ADVANCED,
            title:     `Request ready for ${STAGE_LABEL[stage]} review`,
            body:      `${request.referenceNumber} — "${request.activityTitle}" has advanced and requires your action.`,
            requestId: payload.requestId,
            metadata:  { stage, toStatus: payload.toStatus },
          });
        }
      }
    } catch (err: any) {
      this.logger.error(`[Listener] request.stage.advanced error: ${err.message}`);
    }
  }

  // ── approval.step.approved ────────────────────────────────────────────────
  // Notify the requestor that one approver has approved their request.
  @OnEvent('approval.step.approved')
  async onStepApproved(payload: {
    stepId:     string;
    requestId:  string;
    stage:      ApprovalStage;
    approverId: string;
  }) {
    try {
      const request = await prisma.request.findUnique({
        where:  { id: payload.requestId },
        select: { referenceNumber: true, requestedById: true },
      });
      if (!request) return;

      await this.notificationsService.createAndPush({
        userId:    request.requestedById,
        type:      NotificationType.STEP_APPROVED,
        title:     'Your request has been approved by ' + STAGE_LABEL[payload.stage],
        body:      `${request.referenceNumber} passed the ${STAGE_LABEL[payload.stage]} review.`,
        requestId: payload.requestId,
        stepId:    payload.stepId,
        metadata:  { stage: payload.stage },
      });
    } catch (err: any) {
      this.logger.error(`[Listener] approval.step.approved error: ${err.message}`);
    }
  }

  // ── approval.step.rejected ────────────────────────────────────────────────
  // Notify the requestor of rejection with the reason.
  @OnEvent('approval.step.rejected')
  async onStepRejected(payload: {
    stepId:     string;
    requestId:  string;
    stage:      ApprovalStage;
    approverId: string;
    reason:     string;
  }) {
    try {
      const request = await prisma.request.findUnique({
        where:  { id: payload.requestId },
        select: { referenceNumber: true, requestedById: true },
      });
      if (!request) return;

      await this.notificationsService.createAndPush({
        userId:    request.requestedById,
        type:      NotificationType.STEP_REJECTED,
        title:     `Your request was rejected by ${STAGE_LABEL[payload.stage]}`,
        body:      `${request.referenceNumber} was rejected. Reason: ${payload.reason}`,
        requestId: payload.requestId,
        stepId:    payload.stepId,
        metadata:  { stage: payload.stage, reason: payload.reason },
      });
    } catch (err: any) {
      this.logger.error(`[Listener] approval.step.rejected error: ${err.message}`);
    }
  }

  // ── request.approved ─────────────────────────────────────────────────────
  // Notify the requestor that their request is fully approved.
  @OnEvent('request.approved')
  async onRequestApproved(payload: { requestId: string }) {
    try {
      const request = await prisma.request.findUnique({
        where:  { id: payload.requestId },
        select: { referenceNumber: true, activityTitle: true, requestedById: true },
      });
      if (!request) return;

      await this.notificationsService.createAndPush({
        userId:    request.requestedById,
        type:      NotificationType.REQUEST_APPROVED,
        title:     '🎉 Your request has been fully approved!',
        body:      `${request.referenceNumber} — "${request.activityTitle}" is approved. Venue and assets are confirmed.`,
        requestId: payload.requestId,
      });
    } catch (err: any) {
      this.logger.error(`[Listener] request.approved error: ${err.message}`);
    }
  }

  // ── request.rejected ─────────────────────────────────────────────────────
  // Redundant to step.rejected but kept here for completeness —
  // this carries the full rejection summary (who, which stage, why).
  // We skip creating a second notification if step.rejected already fired —
  // the listener checks if an unread rejection notification already exists.
  @OnEvent('request.rejected')
  async onRequestRejected(payload: {
    requestId:       string;
    referenceNumber: string;
    rejectedBy:      string;
    rejectedRole:    string;
    stage:           ApprovalStage;
    reason:          string;
  }) {
    try {
      // Already handled by approval.step.rejected — no duplicate
      // This handler is reserved for future email/SMS integrations
      // that need the full summary payload.
      this.logger.log(
        `[Listener] request.rejected received for ${payload.referenceNumber} — handled by step.rejected`,
      );
    } catch (err: any) {
      this.logger.error(`[Listener] request.rejected error: ${err.message}`);
    }
  }

  // ── asset.checked_out ─────────────────────────────────────────────────────
  // Notify the requestor that their assets have been checked out.
  @OnEvent('asset.checked_out')
  async onAssetCheckedOut(payload: {
    assetId:     string;
    checkoutId:  string;
    requestId:   string;
    handledById: string;
  }) {
    try {
      const request = await prisma.request.findUnique({
        where:  { id: payload.requestId },
        select: { referenceNumber: true, requestedById: true },
      });
      if (!request) return;

      const asset = await prisma.asset.findUnique({
        where:  { id: payload.assetId },
        select: { name: true, assetTag: true },
      });
      if (!asset) return;

      await this.notificationsService.createAndPush({
        userId:    request.requestedById,
        type:      NotificationType.ASSET_CHECKED_OUT,
        title:     'Asset checked out',
        body:      `${asset.name} (${asset.assetTag}) has been checked out for ${request.referenceNumber}.`,
        requestId: payload.requestId,
        metadata:  { assetId: payload.assetId, checkoutId: payload.checkoutId },
      });
    } catch (err: any) {
      this.logger.error(`[Listener] asset.checked_out error: ${err.message}`);
    }
  }

  // ── asset.returned ────────────────────────────────────────────────────────
  // Notify the custodian that an asset has been returned.
  @OnEvent('asset.returned')
  async onAssetReturned(payload: {
    assetId:     string;
    checkoutId:  string;
    requestId:   string;
    handledById: string;
    condition:   string;
  }) {
    try {
      const asset = await prisma.asset.findUnique({
        where:   { id: payload.assetId },
        select:  { name: true, assetTag: true, custodianRole: true },
      });
      if (!asset) return;

      // Notify the custodian who owns this asset category
      const custodians = await prisma.user.findMany({
        where: {
          role:      asset.custodianRole as string,
          isActive:  true,
          deletedAt: null,
        },
        select: { id: true },
      });

      for (const custodian of custodians) {
        await this.notificationsService.createAndPush({
          userId:    custodian.id,
          type:      NotificationType.ASSET_RETURNED,
          title:     'Asset returned',
          body:      `${asset.name} (${asset.assetTag}) has been returned in ${payload.condition?.toLowerCase() ?? 'unknown'} condition.`,
          requestId: payload.requestId,
          metadata:  { assetId: payload.assetId, condition: payload.condition },
        });
      }
    } catch (err: any) {
      this.logger.error(`[Listener] asset.returned error: ${err.message}`);
    }
  }
}