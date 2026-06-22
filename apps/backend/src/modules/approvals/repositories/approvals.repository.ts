// File: apps/backend/src/modules/approvals/repositories/approvals.repository.ts
// Purpose: All Prisma queries for approval steps, decisions, chain transitions,
//          and revision workflows. The service layer never calls prisma directly.
// Dependencies: @repo/database, @nestjs/common

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import {
  ApprovalStage,
  ApprovalStatus,
  RequestStatus,
  RevisionType,
} from '@repo/database';

const STEP_WITH_REQUEST = {
  request: {
    select: {
      id:              true,
      referenceNumber: true,
      activityTitle:   true,
      status:          true,
      activityStartAt: true,
      activityEndAt:   true,
      requestedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  },
} as const;

@Injectable()
export class ApprovalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findStepById(stepId: string) {
    return this.prisma.approvalStep.findUnique({
      where:   { id: stepId },
      include: STEP_WITH_REQUEST,
    });
  }

  async findStepsByRequestId(requestId: string) {
    return this.prisma.approvalStep.findMany({
      where:   { requestId },
      orderBy: { stepOrder: 'asc' },
      include: STEP_WITH_REQUEST,
    });
  }

  async findPendingForUser(params: {
    userId:   string;
    userRole: string;
    stage?:   ApprovalStage;
    skip:     number;
    take:     number;
    status?:  ApprovalStatus;
  }) {
    const { userId, userRole, skip, take, status } = params;

    const { ROLE_TO_STAGE } = await import('../domain/entities/approval-step.entity');
    const assignedStage = ROLE_TO_STAGE[userRole] ?? null;

    const where = {
      status: status ?? ApprovalStatus.PENDING,
      OR: [
        { approverId: userId },
        ...(assignedStage ? [{
          approverId: null,
          stage:      assignedStage,
        }] : []),
      ],
      request: {
        deletedAt: null,
        status: {
          in: this.actionableRequestStatuses(assignedStage),
        },
      },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.approvalStep.findMany({
        where,
        skip,
        take,
        orderBy: [
          { request: { submittedAt: 'asc' } },
          { stepOrder: 'asc' },
        ],
        include: STEP_WITH_REQUEST,
      }),
      this.prisma.approvalStep.count({ where }),
    ]);

    return { data, total };
  }

  async recordDecision(stepId: string, data: {
    status:           ApprovalStatus;
    approverName:     string;
    approverRole:     string;
    approverTitle:    string;
    remarks?:         string;
    rejectionReason?: string;
  }) {
    return this.prisma.approvalStep.update({
      where: { id: stepId },
      data: {
        status:          data.status,
        approverName:    data.approverName,
        approverRole:    data.approverRole,
        approverTitle:   data.approverTitle,
        remarks:         data.remarks        ?? null,
        rejectionReason: data.rejectionReason ?? null,
        decidedAt:       new Date(),
      },
      include: STEP_WITH_REQUEST,
    });
  }

  // ── NEW: Record a revision request on a step ────────────────────────────────
  async recordRevision(stepId: string, data: {
    revisionType: RevisionType;
    approverName: string;
    approverRole: string;
    approverTitle: string;
    remarks: string;
  }) {
    return this.prisma.approvalStep.update({
      where: { id: stepId },
      data: {
        status:        ApprovalStatus.REVISION_REQUESTED,
        revisionType:    data.revisionType,
        approverName:    data.approverName,
        approverRole:    data.approverRole,
        approverTitle:   data.approverTitle,
        remarks:         data.remarks,
        decidedAt:       new Date(),
      },
      include: STEP_WITH_REQUEST,
    });
  }

  // ── NEW: Suspend all PENDING steps after a given stepOrder ────────────────
  async suspendPendingStepsAfter(requestId: string, afterStepOrder: number) {
    return this.prisma.approvalStep.updateMany({
      where: {
        requestId,
        stepOrder: { gt: afterStepOrder },
        status:    ApprovalStatus.PENDING,
      },
      data: { status: ApprovalStatus.SUSPENDED },
    });
  }

  // ── NEW: Reset SUSPENDED steps back to PENDING ────────────────────────────
  async resetSuspendedSteps(requestId: string) {
    return this.prisma.approvalStep.updateMany({
      where: {
        requestId,
        status: ApprovalStatus.SUSPENDED,
      },
      data: {
        status:        ApprovalStatus.PENDING,
        revisionType:  null,
        decidedAt:     null,
        remarks:       null,
        approverName:  null,
        approverRole:  null,
        approverTitle: null,
      },
    });
  }

  // ── NEW: Reset a single REVISION_REQUESTED step back to PENDING ─────────────
  async resetRevisionStep(stepId: string) {
    return this.prisma.approvalStep.update({
      where: { id: stepId },
      data: {
        status:        ApprovalStatus.PENDING,
        revisionType:  null,
        decidedAt:     null,
        remarks:       null,
        approverName:  null,
        approverRole:  null,
        approverTitle: null,
      },
      include: STEP_WITH_REQUEST,
    });
  }

  // ── NEW: Delete all steps for a request (used in REVISION_RESTART) ──────────
  async deleteAllSteps(requestId: string) {
    return this.prisma.approvalStep.deleteMany({
      where: { requestId },
    });
  }

  // ── NEW: Create multiple steps at once (used in REVISION_RESTART) ───────────
  async createSteps(data: {
    requestId: string;
    stage: ApprovalStage;
    stepOrder: number;
    title: string;
    approverId: string | null;
  }[]) {
    return this.prisma.approvalStep.createMany({
      data: data.map(step => ({
        requestId:     step.requestId,
        stage:         step.stage,
        stepOrder:     step.stepOrder,
        approverTitle: step.title,
        approverId:    step.approverId,
        status:        ApprovalStatus.PENDING,
      })),
      skipDuplicates: true,
    });
  }

  async transitionRequestStatus(requestId: string, status: RequestStatus) {
    return this.prisma.request.update({
      where: { id: requestId },
      data:  { status },
    });
  }

  // ── NEW: Update request revision fields ───────────────────────────────────
  async updateRequestRevisionState(requestId: string, data: {
    status: RequestStatus;
    previousStatus?: RequestStatus | null;
    revisionCount?: { increment: number };
    revisedAt?: Date;
  }) {
    return this.prisma.request.update({
      where: { id: requestId },
      data: {
        status: data.status,
        ...(data.previousStatus !== undefined && { previousStatus: data.previousStatus }),
        ...(data.revisionCount && { revisionCount: data.revisionCount }),
        ...(data.revisedAt && { revisedAt: data.revisedAt }),
      },
    });
  }

  async lockVenues(requestId: string) {
    return this.prisma.venueBooking.updateMany({
      where: { requestId },
      data:  { isLocked: true },
    });
  }

  async unlockVenues(requestId: string) {
    return this.prisma.venueBooking.updateMany({
      where: { requestId },
      data:  { isLocked: false },
    });
  }

  async confirmVenues(requestId: string) {
    return this.prisma.venueBooking.updateMany({
      where: { requestId },
      data:  {
        isLocked:    true,
        confirmedAt: new Date(),
      },
    });
  }

  async skipRemainingSteps(requestId: string, excludeStepId: string) {
    return this.prisma.approvalStep.updateMany({
      where: {
        requestId,
        status: ApprovalStatus.PENDING,
        id:     { not: excludeStepId },
      },
      data: { status: ApprovalStatus.SKIPPED },
    });
  }

  async countStage2Approved(requestId: string): Promise<number> {
    return this.prisma.approvalStep.count({
      where: {
        requestId,
        stage: {
          in: [
            ApprovalStage.STAGE_2_MIS,
            ApprovalStage.STAGE_2_BUILDING,
            ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS,
            ApprovalStage.STAGE_2_ACADEMIC_HEAD,
          ],
        },
        status: ApprovalStatus.APPROVED,
      },
    });
  }

  // ── NEW: Count how many Stage 2 steps exist (for restart validation) ───────
  async countStage2Steps(requestId: string): Promise<number> {
    return this.prisma.approvalStep.count({
      where: {
        requestId,
        stage: {
          in: [
            ApprovalStage.STAGE_2_MIS,
            ApprovalStage.STAGE_2_BUILDING,
            ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS,
            ApprovalStage.STAGE_2_ACADEMIC_HEAD,
          ],
        },
      },
    });
  }

  // ── NEW: Get the current adviser step's approverId ──────────────────────────
  async findAdviserApproverId(requestId: string): Promise<string | null> {
    const step = await this.prisma.approvalStep.findFirst({
      where: {
        requestId,
        stage: ApprovalStage.STAGE_1_ADVISER,
      },
      select: { approverId: true },
    });
    return step?.approverId ?? null;
  }

  private actionableRequestStatuses(stage: ApprovalStage | null): RequestStatus[] {
    if (!stage) return [];
    switch (stage) {
      case ApprovalStage.STAGE_1_ADVISER:       return [RequestStatus.PENDING];
      case ApprovalStage.STAGE_1_DEPT_HEAD:     return [RequestStatus.STAGE1_REVIEW];
      case ApprovalStage.STAGE_2_MIS:
      case ApprovalStage.STAGE_2_BUILDING:
      case ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS:
      case ApprovalStage.STAGE_2_ACADEMIC_HEAD: return [RequestStatus.STAGE2_REVIEW];
      case ApprovalStage.STAGE_3_SCHOOL_ADMIN:  return [RequestStatus.PENDING_FINAL];
      default:                                  return [];
    }
  }
}