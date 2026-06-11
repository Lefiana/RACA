// File: apps/backend/src/modules/audit-logs/listeners/audit-logs.listener.ts
// CHANGED: inject PrismaService instead of importing prisma directly
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent }            from '@nestjs/event-emitter';
import { ApprovalStage }      from '@repo/database';
import { PrismaService }      from '../../../prisma.service';
import { AuditLogsService }   from '../services/audit-logs.service';

@Injectable()
export class AuditLogsListener {
  private readonly logger = new Logger(AuditLogsListener.name);

  constructor(
    private readonly auditLogsService: AuditLogsService,
    private readonly prisma:           PrismaService, // CHANGED
  ) {}

  @OnEvent('request.created')
  async onRequestCreated(payload: { requestId: string; userId: string }) {
    try {
      const request = await this.prisma.request.findUnique({
        where:  { id: payload.requestId },
        select: { referenceNumber: true, activityTitle: true, status: true },
      });
      if (!request) return;
      await this.auditLogsService.create({
        performedById: payload.userId,
        requestId:     payload.requestId,
        action:        'REQUEST_CREATED',
        entity:        'Request',
        entityId:      payload.requestId,
        snapshot:      { referenceNumber: request.referenceNumber, activityTitle: request.activityTitle, status: request.status },
      });
    } catch (err: any) {
      this.logger.error(`[AuditListener] request.created error: ${err.message}`);
    }
  }

  @OnEvent('request.submitted')
  async onRequestSubmitted(payload: { requestId: string; userId: string; referenceNumber: string }) {
    try {
      const request = await this.prisma.request.findUnique({
        where:  { id: payload.requestId },
        select: {
          referenceNumber: true, activityTitle: true, status: true,
          venueBookings:  { select: { venueId: true } },
          assetCheckouts: { select: { assetId: true } },
        },
      });
      if (!request) return;
      await this.auditLogsService.create({
        performedById: payload.userId,
        requestId:     payload.requestId,
        action:        'REQUEST_SUBMITTED',
        entity:        'Request',
        entityId:      payload.requestId,
        snapshot: {
          referenceNumber: request.referenceNumber,
          activityTitle:   request.activityTitle,
          status:          request.status,
          venueIds:        request.venueBookings.map(b => b.venueId),
          assetIds:        request.assetCheckouts.map(c => c.assetId),
        },
      });
    } catch (err: any) {
      this.logger.error(`[AuditListener] request.submitted error: ${err.message}`);
    }
  }

  @OnEvent('request.updated')
  async onRequestUpdated(payload: { requestId: string; userId: string; wasReset: boolean }) {
    try {
      const request = await this.prisma.request.findUnique({
        where:  { id: payload.requestId },
        select: { referenceNumber: true, activityTitle: true, status: true },
      });
      if (!request) return;
      await this.auditLogsService.create({
        performedById: payload.userId,
        requestId:     payload.requestId,
        action:        'REQUEST_UPDATED',
        entity:        'Request',
        entityId:      payload.requestId,
        snapshot:      { referenceNumber: request.referenceNumber, activityTitle: request.activityTitle, status: request.status, approvalStepsReset: payload.wasReset },
      });
    } catch (err: any) {
      this.logger.error(`[AuditListener] request.updated error: ${err.message}`);
    }
  }

  @OnEvent('request.cancelled')
  async onRequestCancelled(payload: { requestId: string; userId: string }) {
    try {
      const request = await this.prisma.request.findFirst({
        where:  { id: payload.requestId },
        select: { referenceNumber: true, activityTitle: true },
      });
      if (!request) return;
      await this.auditLogsService.create({
        performedById: payload.userId,
        requestId:     payload.requestId,
        action:        'REQUEST_CANCELLED',
        entity:        'Request',
        entityId:      payload.requestId,
        snapshot:      { referenceNumber: request.referenceNumber, activityTitle: request.activityTitle },
      });
    } catch (err: any) {
      this.logger.error(`[AuditListener] request.cancelled error: ${err.message}`);
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
      await this.auditLogsService.create({
        performedById: null,
        requestId:     payload.requestId,
        action:        'REQUEST_APPROVED',
        entity:        'Request',
        entityId:      payload.requestId,
        snapshot:      { referenceNumber: request.referenceNumber, activityTitle: request.activityTitle, requestedById: request.requestedById },
      });
    } catch (err: any) {
      this.logger.error(`[AuditListener] request.approved error: ${err.message}`);
    }
  }

  @OnEvent('request.rejected')
  async onRequestRejected(payload: { requestId: string; referenceNumber: string; rejectedBy: string; rejectedRole: string; stage: ApprovalStage; reason: string }) {
    try {
      await this.auditLogsService.create({
        performedById: null,
        requestId:     payload.requestId,
        action:        'REQUEST_REJECTED',
        entity:        'Request',
        entityId:      payload.requestId,
        snapshot:      { referenceNumber: payload.referenceNumber, rejectedBy: payload.rejectedBy, rejectedRole: payload.rejectedRole, stage: payload.stage, reason: payload.reason },
      });
    } catch (err: any) {
      this.logger.error(`[AuditListener] request.rejected error: ${err.message}`);
    }
  }

  @OnEvent('request.stage.advanced')
  async onStageAdvanced(payload: { requestId: string; fromStatus: string; toStatus: string }) {
    try {
      const request = await this.prisma.request.findUnique({
        where:  { id: payload.requestId },
        select: { referenceNumber: true },
      });
      if (!request) return;
      await this.auditLogsService.create({
        performedById: null,
        requestId:     payload.requestId,
        action:        'REQUEST_STAGE_ADVANCED',
        entity:        'Request',
        entityId:      payload.requestId,
        snapshot:      { referenceNumber: request.referenceNumber, fromStatus: payload.fromStatus, toStatus: payload.toStatus },
      });
    } catch (err: any) {
      this.logger.error(`[AuditListener] request.stage.advanced error: ${err.message}`);
    }
  }

  @OnEvent('approval.step.approved')
  async onStepApproved(payload: { stepId: string; requestId: string; stage: ApprovalStage; approverId: string }) {
    try {
      const step = await this.prisma.approvalStep.findUnique({
        where:  { id: payload.stepId },
        select: { approverName: true, approverRole: true, approverTitle: true, remarks: true, decidedAt: true },
      });
      if (!step) return;
      await this.auditLogsService.create({
        performedById: payload.approverId,
        requestId:     payload.requestId,
        action:        'STEP_APPROVED',
        entity:        'ApprovalStep',
        entityId:      payload.stepId,
        snapshot:      { stage: payload.stage, ...step },
      });
    } catch (err: any) {
      this.logger.error(`[AuditListener] approval.step.approved error: ${err.message}`);
    }
  }

  @OnEvent('approval.step.rejected')
  async onStepRejected(payload: { stepId: string; requestId: string; stage: ApprovalStage; approverId: string; reason: string }) {
    try {
      const step = await this.prisma.approvalStep.findUnique({
        where:  { id: payload.stepId },
        select: { approverName: true, approverRole: true, approverTitle: true, rejectionReason: true, decidedAt: true },
      });
      if (!step) return;
      await this.auditLogsService.create({
        performedById: payload.approverId,
        requestId:     payload.requestId,
        action:        'STEP_REJECTED',
        entity:        'ApprovalStep',
        entityId:      payload.stepId,
        snapshot:      { stage: payload.stage, ...step },
      });
    } catch (err: any) {
      this.logger.error(`[AuditListener] approval.step.rejected error: ${err.message}`);
    }
  }

  @OnEvent('asset.checked_out')
  async onAssetCheckedOut(payload: { assetId: string; checkoutId: string; requestId: string; handledById: string }) {
    try {
      const checkout = await this.prisma.assetCheckout.findUnique({
        where:  { id: payload.checkoutId },
        select: { quantity: true, conditionOnOut: true, checkedOutAt: true, asset: { select: { assetTag: true, name: true } } },
      });
      if (!checkout) return;
      await this.auditLogsService.create({
        performedById: payload.handledById,
        requestId:     payload.requestId,
        action:        'ASSET_CHECKED_OUT',
        entity:        'AssetCheckout',
        entityId:      payload.checkoutId,
        snapshot:      { assetTag: checkout.asset.assetTag, assetName: checkout.asset.name, quantity: checkout.quantity, conditionOnOut: checkout.conditionOnOut, checkedOutAt: checkout.checkedOutAt },
      });
    } catch (err: any) {
      this.logger.error(`[AuditListener] asset.checked_out error: ${err.message}`);
    }
  }

  @OnEvent('asset.returned')
  async onAssetReturned(payload: { assetId: string; checkoutId: string; requestId: string; handledById: string; condition: string }) {
    try {
      const checkout = await this.prisma.assetCheckout.findUnique({
        where:  { id: payload.checkoutId },
        select: { quantity: true, conditionOnReturn: true, returnedAt: true, damageNotes: true, asset: { select: { assetTag: true, name: true } } },
      });
      if (!checkout) return;
      await this.auditLogsService.create({
        performedById: payload.handledById,
        requestId:     payload.requestId,
        action:        'ASSET_RETURNED',
        entity:        'AssetCheckout',
        entityId:      payload.checkoutId,
        snapshot:      { assetTag: checkout.asset.assetTag, assetName: checkout.asset.name, quantity: checkout.quantity, conditionOnReturn: checkout.conditionOnReturn, returnedAt: checkout.returnedAt, damageNotes: checkout.damageNotes },
      });
    } catch (err: any) {
      this.logger.error(`[AuditListener] asset.returned error: ${err.message}`);
    }
  }

  @OnEvent('attachment.uploaded')
  async onAttachmentUploaded(payload: { attachmentId: string; requestId?: string; stepId?: string; uploadedById: string }) {
    try {
      const attachment = await this.prisma.attachment.findUnique({
        where:  { id: payload.attachmentId },
        select: { originalName: true, mimeType: true, sizeBytes: true, label: true },
      });
      if (!attachment) return;
      await this.auditLogsService.create({
        performedById: payload.uploadedById,
        requestId:     payload.requestId,
        action:        'ATTACHMENT_UPLOADED',
        entity:        'Attachment',
        entityId:      payload.attachmentId,
        snapshot:      { ...attachment, context: payload.stepId ? 'step' : 'request', contextId: payload.stepId ?? payload.requestId },
      });
    } catch (err: any) {
      this.logger.error(`[AuditListener] attachment.uploaded error: ${err.message}`);
    }
  }

  @OnEvent('attachment.deleted')
  async onAttachmentDeleted(payload: { attachmentId: string; requestId?: string; stepId?: string }) {
    try {
      await this.auditLogsService.create({
        performedById: null,
        requestId:     payload.requestId,
        action:        'ATTACHMENT_DELETED',
        entity:        'Attachment',
        entityId:      payload.attachmentId,
        snapshot:      { context: payload.stepId ? 'step' : 'request', contextId: payload.stepId ?? payload.requestId },
      });
    } catch (err: any) {
      this.logger.error(`[AuditListener] attachment.deleted error: ${err.message}`);
    }
  }
}