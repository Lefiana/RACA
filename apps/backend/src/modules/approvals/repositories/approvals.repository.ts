// File: apps/backend/src/modules/approvals/repositories/approvals.repository.ts
// CHANGED: inject PrismaService instead of importing prisma directly
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import {
  ApprovalStage,
  ApprovalStatus,
  RequestStatus,
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

  async transitionRequestStatus(requestId: string, status: RequestStatus) {
    return this.prisma.request.update({
      where: { id: requestId },
      data:  { status },
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