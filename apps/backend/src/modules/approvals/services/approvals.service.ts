// File: apps/backend/src/modules/approvals/services/approvals.service.ts
// Purpose: Core approval chain engine.
//          Handles approve/reject/revision decisions, stage transitions,
//          venue locking/unlocking, parallel Stage 2 completion detection,
//          and domain event emission.
// Dependencies: ApprovalsRepository, EventEmitter2, @nestjs/common, @repo/database

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApprovalStage,
  ApprovalStatus,
  RequestStatus,
  RevisionType,
} from '@repo/database';

import { ApprovalsRepository }  from '../repositories/approvals.repository';
import { DecideApprovalDto }    from '../dto/decide-approval.dto';
import { RequestRevisionDto }   from '../dto/request-revision.dto';
import { QueryApprovalsDto }    from '../dto/query-approvals.dto';
import {
  STAGE_ROLE_LABEL,
  ROLE_TO_STAGE,
} from '../domain/entities/approval-step.entity';

// Total number of Stage 2 approvers — all must approve before advancing
const STAGE_2_TOTAL = 4;

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(
    private readonly approvalsRepo: ApprovalsRepository,
    private readonly eventEmitter:  EventEmitter2,
  ) {}

  // ── Pending queue for the session user ───────────────────────────────────

  async findPending(userId: string, userRole: string, query: QueryApprovalsDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.approvalsRepo.findPendingForUser({
      userId,
      userRole,
      skip:   (page - 1) * limit,
      take:   limit,
      status: query.status,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages:  Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  // ── All steps for a request ───────────────────────────────────────────────

  async findByRequest(requestId: string) {
    return this.approvalsRepo.findStepsByRequestId(requestId);
  }

  async findStepById(stepId: string, userId: string, userRole: string) {
    const step = await this.approvalsRepo.findStepById(stepId);
    if (!step) throw new NotFoundException('Approval step not found');

    const userStage      = ROLE_TO_STAGE[userRole] ?? null;
    const isAssigned     = step.approverId === userId;
    const isRoleFallback = step.approverId === null && userStage === step.stage;

    if (!isAssigned && !isRoleFallback) {
      throw new ForbiddenException('You are not authorized to view this step');
    }

    return step;
  }

  // ── Approve ───────────────────────────────────────────────────────────────

  async approve(
    stepId:   string,
    userId:   string,
    userName: string,
    userRole: string,
    dto:      DecideApprovalDto,
  ) {
    this.logger.log(`[ApprovalsService] approve — stepId: ${stepId}, userId: ${userId}`);

    const step = await this.approvalsRepo.findStepById(stepId);
    if (!step) throw new NotFoundException('Approval step not found');

    this.assertCanAct(step, userId, userRole);

    const decided = await this.approvalsRepo.recordDecision(stepId, {
      status:        ApprovalStatus.APPROVED,
      approverName:  userName,
      approverRole:  userRole,
      approverTitle: STAGE_ROLE_LABEL[step.stage],
      remarks:       dto.remarks,
    });

    this.logger.log(`[ApprovalsService] step approved: ${step.stage} on ${step.requestId}`);

    this.eventEmitter.emit('approval.step.approved', {
      stepId,
      requestId:  step.requestId,
      stage:      step.stage,
      approverId: userId,
    });

    await this.advanceChain(step.requestId, step.stage);

    return decided;
  }

  // ── Reject ────────────────────────────────────────────────────────────────

  async reject(
    stepId:   string,
    userId:   string,
    userName: string,
    userRole: string,
    dto:      DecideApprovalDto,
  ) {
    this.logger.log(`[ApprovalsService] reject — stepId: ${stepId}, userId: ${userId}`);

    if (!dto.rejectionReason || dto.rejectionReason.trim().length < 10) {
      throw new BadRequestException(
        'A rejection reason of at least 10 characters is required',
      );
    }

    const step = await this.approvalsRepo.findStepById(stepId);
    if (!step) throw new NotFoundException('Approval step not found');

    this.assertCanAct(step, userId, userRole);

    const decided = await this.approvalsRepo.recordDecision(stepId, {
      status:          ApprovalStatus.REJECTED,
      approverName:    userName,
      approverRole:    userRole,
      approverTitle:   STAGE_ROLE_LABEL[step.stage],
      remarks:         dto.remarks,
      rejectionReason: dto.rejectionReason,
    });

    await this.terminateChain(step.requestId, stepId);

    this.logger.log(`[ApprovalsService] rejected: ${step.stage} on ${step.requestId}`);

    this.eventEmitter.emit('approval.step.rejected', {
      stepId,
      requestId:  step.requestId,
      stage:      step.stage,
      approverId: userId,
      reason:     dto.rejectionReason,
    });

    this.eventEmitter.emit('request.rejected', {
      requestId:       step.requestId,
      referenceNumber: step.request?.referenceNumber,
      rejectedBy:      userName,
      rejectedRole:    userRole,
      stage:           step.stage,
      reason:          dto.rejectionReason,
    });

    return decided;
  }

  // ── NEW: Request Revision ─────────────────────────────────────────────────

  async requestRevision(
    stepId:   string,
    userId:   string,
    userName: string,
    userRole: string,
    dto:      RequestRevisionDto,
  ) {
    this.logger.log(
      `[ApprovalsService] requestRevision — stepId: ${stepId}, type: ${dto.revisionType}, userId: ${userId}`,
    );

    const step = await this.approvalsRepo.findStepById(stepId);
    if (!step) throw new NotFoundException('Approval step not found');

    this.assertCanAct(step, userId, userRole);

    // Validate remarks
    if (!dto.remarks || dto.remarks.trim().length < 10) {
      throw new BadRequestException('Revision remarks must be at least 10 characters');
    }

    // Capture current request status before we change it
    const currentRequestStatus = step.request?.status as RequestStatus;

    // ── Execute revision atomically ─────────────────────────────────────────
    const revisedStep = await this.approvalsRepo.recordRevision(stepId, {
      revisionType:  dto.revisionType,
      approverName:  userName,
      approverRole:  userRole,
      approverTitle: STAGE_ROLE_LABEL[step.stage],
      remarks:       dto.remarks,
    });

    // Suspend all PENDING steps after this one
    await this.approvalsRepo.suspendPendingStepsAfter(
      step.requestId,
      step.stepOrder,
    );

    // Update request to REVISION_REQUESTED state
    await this.approvalsRepo.updateRequestRevisionState(step.requestId, {
      status:         RequestStatus.REVISION_REQUESTED,
      previousStatus: currentRequestStatus,
      revisionCount:  { increment: 1 },
      revisedAt:      new Date(),
    });

    this.logger.log(
      `[ApprovalsService] revision requested: ${dto.revisionType} on ${step.stage} for ${step.requestId}`,
    );

    // Emit events
    this.eventEmitter.emit('approval.step.revision_requested', {
      stepId,
      requestId:    step.requestId,
      stage:        step.stage,
      approverId:   userId,
      revisionType: dto.revisionType,
      remarks:      dto.remarks,
    });

    this.eventEmitter.emit('request.revision_requested', {
      requestId:       step.requestId,
      referenceNumber: step.request?.referenceNumber,
      requestedBy:     step.request?.requestedBy?.id,
      revisionType:    dto.revisionType,
      stage:           step.stage,
      remarks:         dto.remarks,
    });

    return revisedStep;
  }

  // ── Chain advancement engine ──────────────────────────────────────────────

  private async advanceChain(requestId: string, approvedStage: ApprovalStage) {
    switch (approvedStage) {

      case ApprovalStage.STAGE_1_ADVISER: {
        await this.approvalsRepo.transitionRequestStatus(
          requestId,
          RequestStatus.STAGE1_REVIEW,
        );
        this.eventEmitter.emit('request.stage.advanced', {
          requestId,
          fromStatus: RequestStatus.PENDING,
          toStatus:   RequestStatus.STAGE1_REVIEW,
        });
        this.logger.log(`[ApprovalsService] ${requestId} → STAGE1_REVIEW`);
        break;
      }

      case ApprovalStage.STAGE_1_DEPT_HEAD: {
        await this.approvalsRepo.transitionRequestStatus(
          requestId,
          RequestStatus.STAGE2_REVIEW,
        );
        await this.approvalsRepo.lockVenues(requestId);

        this.eventEmitter.emit('request.stage.advanced', {
          requestId,
          fromStatus: RequestStatus.STAGE1_REVIEW,
          toStatus:   RequestStatus.STAGE2_REVIEW,
        });
        this.logger.log(`[ApprovalsService] ${requestId} → STAGE2_REVIEW (venues locked)`);
        break;
      }

      case ApprovalStage.STAGE_2_MIS:
      case ApprovalStage.STAGE_2_BUILDING:
      case ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS:
      case ApprovalStage.STAGE_2_ACADEMIC_HEAD: {
        const approvedCount = await this.approvalsRepo.countStage2Approved(requestId);

        if (approvedCount === STAGE_2_TOTAL) {
          await this.approvalsRepo.transitionRequestStatus(
            requestId,
            RequestStatus.PENDING_FINAL,
          );
          this.eventEmitter.emit('request.stage.advanced', {
            requestId,
            fromStatus: RequestStatus.STAGE2_REVIEW,
            toStatus:   RequestStatus.PENDING_FINAL,
          });
          this.logger.log(`[ApprovalsService] ${requestId} → PENDING_FINAL (all Stage 2 approved)`);
        } else {
          this.logger.log(
            `[ApprovalsService] ${requestId} Stage 2 progress: ${approvedCount}/${STAGE_2_TOTAL}`,
          );
        }
        break;
      }

      case ApprovalStage.STAGE_3_SCHOOL_ADMIN: {
        await this.approvalsRepo.transitionRequestStatus(
          requestId,
          RequestStatus.APPROVED,
        );
        await this.approvalsRepo.confirmVenues(requestId);

        this.eventEmitter.emit('request.approved', {
          requestId,
        });
        this.eventEmitter.emit('request.stage.advanced', {
          requestId,
          fromStatus: RequestStatus.PENDING_FINAL,
          toStatus:   RequestStatus.APPROVED,
        });
        this.logger.log(`[ApprovalsService] ${requestId} → APPROVED ✓`);
        break;
      }
    }
  }

  // ── Chain termination on rejection ───────────────────────────────────────

  private async terminateChain(requestId: string, rejectedStepId: string) {
    await Promise.all([
      this.approvalsRepo.transitionRequestStatus(requestId, RequestStatus.REJECTED),
      this.approvalsRepo.skipRemainingSteps(requestId, rejectedStepId),
      this.approvalsRepo.unlockVenues(requestId),
    ]);

    this.logger.log(`[ApprovalsService] ${requestId} → REJECTED (chain terminated)`);
  }

  // ── Authorization guard ───────────────────────────────────────────────────

  private assertCanAct(
    step:     { approverId: string | null; stage: ApprovalStage; status: ApprovalStatus },
    userId:   string,
    userRole: string,
  ) {
    // Only PENDING steps can be acted on. This naturally blocks:
    // APPROVED, REJECTED, SKIPPED, REVISION_REQUESTED, SUSPENDED
    if (step.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(
        `This step has already been ${step.status.toLowerCase().replace('_', ' ')}`,
      );
    }

    const isExplicitlyAssigned = step.approverId === userId;
    const userStage            = ROLE_TO_STAGE[userRole] ?? null;
    const isRoleFallback       = step.approverId === null && userStage === step.stage;

    if (!isExplicitlyAssigned && !isRoleFallback) {
      throw new ForbiddenException(
        'You are not authorized to act on this approval step',
      );
    }
  }
}