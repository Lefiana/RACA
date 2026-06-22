// File: apps/backend/src/modules/notifications/listeners/notifications.listener.ts
// CHANGED: inject PrismaService instead of importing prisma directly
// CHANGED: Fixed request.submitted to notify ONLY the assigned adviser (not all advisers)
// NEW: Added listeners for revision_requested and resubmitted events
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent }            from '@nestjs/event-emitter';
import { NotificationType, ApprovalStage, UserRole } from '@repo/database';
import { PrismaService }        from '../../../prisma.service';
import { NotificationsService } from '../services/notifications.service';

const STAGE_LABEL: Record<ApprovalStage, string> = {
  [ApprovalStage.STAGE_1_ADVISER]:                 'Adviser',
  [ApprovalStage.STAGE_1_DEPT_HEAD]:               'Department Head',
  [ApprovalStage.STAGE_2_MIS]:                     'MIS',
  [ApprovalStage.STAGE_2_BUILDING]:                'Building Administrator',
  [ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS]: 'Head of Student Affairs',
  [ApprovalStage.STAGE_2_ACADEMIC_HEAD]:           'Academic Head',
  [ApprovalStage.STAGE_3_SCHOOL_ADMIN]:            'School Administrator',
};

const STAGE_TO_ROLE: Record<ApprovalStage, string> = {
  [ApprovalStage.STAGE_1_ADVISER]:                 'ADVISER',
  [ApprovalStage.STAGE_1_DEPT_HEAD]:               'DEPARTMENT_HEAD',
  [ApprovalStage.STAGE_2_MIS]:                     'MIS',
  [ApprovalStage.STAGE_2_BUILDING]:                'BUILDING_ADMIN',
  [ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS]: 'STUDENT_AFFAIRS',
  [ApprovalStage.STAGE_2_ACADEMIC_HEAD]:           'ACADEMIC_HEAD',
  [ApprovalStage.STAGE_3_SCHOOL_ADMIN]:            'SCHOOL_ADMIN',
};

const STAGE2_STAGES: ApprovalStage[] = [
  ApprovalStage.STAGE_2_MIS,
  ApprovalStage.STAGE_2_BUILDING,
  ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS,
  ApprovalStage.STAGE_2_ACADEMIC_HEAD,
];

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma:               PrismaService,
  ) {}

  // ── CHANGED: Notify ONLY the assigned adviser, not all advisers ───────────
  @OnEvent('request.submitted')
  async onRequestSubmitted(payload: { requestId: string; userId: string; referenceNumber: string }) {
    try {
      // Find the specifically assigned adviser for this request
      const adviserStep = await this.prisma.approvalStep.findFirst({
        where: {
          requestId: payload.requestId,
          stage:     ApprovalStage.STAGE_1_ADVISER,
        },
        select: { approverId: true },
      });

      if (adviserStep?.approverId) {
        await this.notificationsService.createAndPush({
          userId:    adviserStep.approverId,
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

  @OnEvent('request.stage.advanced')
  async onStageAdvanced(payload: { requestId: string; fromStatus: string; toStatus: string }) {
    try {
      const request = await this.prisma.request.findUnique({
        where:  { id: payload.requestId },
        select: { referenceNumber: true, activityTitle: true },
      });
      if (!request) return;

      let stagesToNotify: ApprovalStage[] = [];
      if (payload.toStatus === 'STAGE1_REVIEW')  stagesToNotify = [ApprovalStage.STAGE_1_DEPT_HEAD];
      else if (payload.toStatus === 'STAGE2_REVIEW') stagesToNotify = STAGE2_STAGES;
      else if (payload.toStatus === 'PENDING_FINAL') stagesToNotify = [ApprovalStage.STAGE_3_SCHOOL_ADMIN];

      for (const stage of stagesToNotify) {
        const role = STAGE_TO_ROLE[stage];
        const step = await this.prisma.approvalStep.findFirst({
          where:  { requestId: payload.requestId, stage },
          select: { approverId: true },
        });

        const userIdsToNotify: string[] = [];
        if (step?.approverId) {
          userIdsToNotify.push(step.approverId);
        } else {
          const users = await this.prisma.user.findMany({
            where:  { role: role as UserRole, isActive: true, deletedAt: null },
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

  @OnEvent('approval.step.approved')
  async onStepApproved(payload: { stepId: string; requestId: string; stage: ApprovalStage; approverId: string }) {
    try {
      const request = await this.prisma.request.findUnique({
        where:  { id: payload.requestId },
        select: { referenceNumber: true, requestedById: true },
      });
      if (!request) return;
      await this.notificationsService.createAndPush({
        userId:    request.requestedById,
        type:      NotificationType.STEP_APPROVED,
        title:     `Your request was approved by ${STAGE_LABEL[payload.stage]}`,
        body:      `${request.referenceNumber} passed the ${STAGE_LABEL[payload.stage]} review.`,
        requestId: payload.requestId,
        stepId:    payload.stepId,
        metadata:  { stage: payload.stage },
      });
    } catch (err: any) {
      this.logger.error(`[Listener] approval.step.approved error: ${err.message}`);
    }
  }

  @OnEvent('approval.step.rejected')
  async onStepRejected(payload: { stepId: string; requestId: string; stage: ApprovalStage; approverId: string; reason: string }) {
    try {
      const request = await this.prisma.request.findUnique({
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

  // ── NEW: Revision requested ───────────────────────────────────────────────
  @OnEvent('request.revision_requested')
  async onRevisionRequested(payload: {
    requestId: string;
    referenceNumber: string;
    requestedBy: string;
    revisionType: string;
    stage: ApprovalStage;
    remarks: string;
  }) {
    try {
      await this.notificationsService.createAndPush({
        userId:    payload.requestedBy,
        type:      NotificationType.REVISION_REQUESTED,
        title:     `Revision requested by ${STAGE_LABEL[payload.stage]}`,
        body:      `${payload.referenceNumber} requires revision. Reason: ${payload.remarks}`,
        requestId: payload.requestId,
        metadata:  { revisionType: payload.revisionType, stage: payload.stage, remarks: payload.remarks },
      });
    } catch (err: any) {
      this.logger.error(`[Listener] request.revision_requested error: ${err.message}`);
    }
  }

  // ── NEW: Resubmitted ──────────────────────────────────────────────────────
  @OnEvent('request.resubmitted')
  async onResubmitted(payload: {
    requestId: string;
    userId: string;
    revisionType: string;
    referenceNumber: string;
  }) {
    try {
      const request = await this.prisma.request.findUnique({
        where:  { id: payload.requestId },
        select: { status: true, approvalSteps: { select: { stage: true, approverId: true } } },
      });
      if (!request) return;

      // Notify the next approver(s) based on restored status
      let stagesToNotify: ApprovalStage[] = [];
      if (request.status === 'PENDING') stagesToNotify = [ApprovalStage.STAGE_1_ADVISER];
      else if (request.status === 'STAGE1_REVIEW') stagesToNotify = [ApprovalStage.STAGE_1_DEPT_HEAD];
      else if (request.status === 'STAGE2_REVIEW') stagesToNotify = STAGE2_STAGES;
      else if (request.status === 'PENDING_FINAL') stagesToNotify = [ApprovalStage.STAGE_3_SCHOOL_ADMIN];

      for (const stage of stagesToNotify) {
        const step = request.approvalSteps.find(s => s.stage === stage);
        if (step?.approverId) {
          await this.notificationsService.createAndPush({
            userId:    step.approverId,
            type:      NotificationType.STAGE_ADVANCED,
            title:     `Request resubmitted for ${STAGE_LABEL[stage]} review`,
            body:      `${payload.referenceNumber} has been resubmitted after revision and requires your action.`,
            requestId: payload.requestId,
            metadata:  { stage, revisionType: payload.revisionType },
          });
        }
      }
    } catch (err: any) {
      this.logger.error(`[Listener] request.resubmitted error: ${err.message}`);
    }
  }

  @OnEvent('request.approved')
  async onRequestApproved(payload: { requestId: string }) {
    try {
      const request = await this.prisma.request.findUnique({
        where:  { id: payload.requestId },
        select: { referenceNumber: true, activityTitle: true, requestedById: true },
      });
      if (!request) return;
      await this.notificationsService.createAndPush({
        userId:    request.requestedById,
        type:      NotificationType.REQUEST_APPROVED,
        title:     '🎉 Your request has been fully approved!',
        body:      `${request.referenceNumber} — "${request.activityTitle}" is approved.`,
        requestId: payload.requestId,
      });
    } catch (err: any) {
      this.logger.error(`[Listener] request.approved error: ${err.message}`);
    }
  }

  @OnEvent('request.rejected')
  async onRequestRejected(payload: { requestId: string; referenceNumber: string; rejectedBy: string; rejectedRole: string; stage: ApprovalStage; reason: string }) {
    this.logger.log(`[Listener] request.rejected received for ${payload.referenceNumber} — handled by step.rejected`);
  }

  @OnEvent('asset.checked_out')
  async onAssetCheckedOut(payload: { assetId: string; checkoutId: string; requestId: string; handledById: string }) {
    try {
      const request = await this.prisma.request.findUnique({
        where:  { id: payload.requestId },
        select: { referenceNumber: true, requestedById: true },
      });
      if (!request) return;
      const asset = await this.prisma.asset.findUnique({
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

  @OnEvent('asset.returned')
  async onAssetReturned(payload: { assetId: string; checkoutId: string; requestId: string; handledById: string; condition: string }) {
    try {
      const asset = await this.prisma.asset.findUnique({
        where:  { id: payload.assetId },
        select: { name: true, assetTag: true, custodianRole: true },
      });
      if (!asset) return;
      const custodians = await this.prisma.user.findMany({
        where:  { role: asset.custodianRole as unknown as UserRole, isActive: true, deletedAt: null },
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