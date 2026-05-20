// File: apps/backend/src/modules/approvals/repositories/approvals.repository.ts
// Purpose: All Prisma queries for ApprovalStep decisions, stage reads,
//          venue lock/unlock operations, and request status transitions.
//          The service never calls prisma directly.
// Dependencies: @repo/database, @nestjs/common

import { Injectable } from '@nestjs/common';
import {
  prisma,
  ApprovalStage,
  ApprovalStatus,
  RequestStatus,
} from '@repo/database';

// Full include used when fetching a step with its request context
const STEP_WITH_REQUEST = {
  request: {
    select: {
      id:             true,
      referenceNumber: true,
      activityTitle:  true,
      status:         true,
      activityStartAt: true,
      activityEndAt:  true,
      requestedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  },
} as const;

@Injectable()
export class ApprovalsRepository {

  // ── Reads ─────────────────────────────────────────────────────────────────

  // Fetch a single step with its parent request
  async findStepById(stepId: string) {
    return prisma.approvalStep.findUnique({
      where:   { id: stepId },
      include: STEP_WITH_REQUEST,
    });
  }

  // All steps for a specific request, ordered by stepOrder
  async findStepsByRequestId(requestId: string) {
    return prisma.approvalStep.findMany({
      where:   { requestId },
      orderBy: { stepOrder: 'asc' },
      include: STEP_WITH_REQUEST,
    });
  }

  // Pending steps where the session user is either:
  //   a) explicitly assigned (approverId = userId), OR
  //   b) holds the matching role (fallback for unassigned steps)
  // Also filters by which stages are currently actionable given request status
  async findPendingForUser(params: {
    userId:      string;
    userRole:    string;
    stage?:      ApprovalStage;
    skip:        number;
    take:        number;
    status?:     ApprovalStatus;
  }) {
    const { userId, userRole, skip, take, status } = params;

    // Map the user's role to the stage they can act on
    const { ROLE_TO_STAGE } = await import('../domain/entities/approval-step.entity');
    const assignedStage = ROLE_TO_STAGE[userRole] ?? null;

    const where = {
      status: status ?? ApprovalStatus.PENDING,
      OR: [
        // Explicitly assigned to this user
        { approverId: userId },
        // Unassigned but user has the matching role
        ...(assignedStage ? [{
          approverId: null,
          stage:      assignedStage,
        }] : []),
      ],
      // Only surface steps whose request is in the right status for their stage
      request: {
        deletedAt: null,
        status: {
          in: this.actionableRequestStatuses(assignedStage),
        },
      },
    };

    const [data, total] = await prisma.$transaction([
      prisma.approvalStep.findMany({
        where,
        skip,
        take,
        orderBy: [
          { request: { submittedAt: 'asc' } }, // oldest first = priority queue
          { stepOrder: 'asc' },
        ],
        include: STEP_WITH_REQUEST,
      }),
      prisma.approvalStep.count({ where }),
    ]);

    return { data, total };
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  // Records the approval decision and writes the immutable snapshot
  async recordDecision(stepId: string, data: {
    status:          ApprovalStatus;
    approverName:    string;
    approverRole:    string;
    approverTitle:   string;
    remarks?:        string;
    rejectionReason?: string;
  }) {
    return prisma.approvalStep.update({
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

  // Transitions the parent request to a new status
  async transitionRequestStatus(requestId: string, status: RequestStatus) {
    return prisma.request.update({
      where: { id: requestId },
      data:  { status },
    });
  }

  // Locks all venue bookings for a request when entering Stage 2
  async lockVenues(requestId: string) {
    return prisma.venueBooking.updateMany({
      where: { requestId },
      data:  { isLocked: true },
    });
  }

  // Releases all venue locks — called on rejection or cancellation
  async unlockVenues(requestId: string) {
    return prisma.venueBooking.updateMany({
      where: { requestId },
      data:  { isLocked: false },
    });
  }

  // Confirms all venue bookings when fully approved
  async confirmVenues(requestId: string) {
    return prisma.venueBooking.updateMany({
      where: { requestId },
      data:  {
        isLocked:    true, // stays locked — now permanently reserved
        confirmedAt: new Date(),
      },
    });
  }

  // Marks all remaining PENDING steps as SKIPPED when a request is rejected
  async skipRemainingSteps(requestId: string, excludeStepId: string) {
    return prisma.approvalStep.updateMany({
      where: {
        requestId,
        status: ApprovalStatus.PENDING,
        id:     { not: excludeStepId },
      },
      data: { status: ApprovalStatus.SKIPPED },
    });
  }

  // Counts how many Stage 2 steps have been approved for a request
  async countStage2Approved(requestId: string): Promise<number> {
    return prisma.approvalStep.count({
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  // Returns the request statuses in which a given stage is currently actionable.
  // Prevents an approver from acting on a step that isn't their turn yet.
  private actionableRequestStatuses(stage: ApprovalStage | null): RequestStatus[] {
    if (!stage) return [];

    switch (stage) {
      case ApprovalStage.STAGE_1_ADVISER:
        return [RequestStatus.PENDING];

      case ApprovalStage.STAGE_1_DEPT_HEAD:
        return [RequestStatus.STAGE1_REVIEW];

      case ApprovalStage.STAGE_2_MIS:
      case ApprovalStage.STAGE_2_BUILDING:
      case ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS:
      case ApprovalStage.STAGE_2_ACADEMIC_HEAD:
        return [RequestStatus.STAGE2_REVIEW];

      case ApprovalStage.STAGE_3_SCHOOL_ADMIN:
        return [RequestStatus.PENDING_FINAL];

      default:
        return [];
    }
  }
}
