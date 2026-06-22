// File: apps/backend/src/modules/requests/services/requests.service.ts
// Purpose: Business logic for the RACA request lifecycle.
//          Enforces all status transition rules, edit windows,
//          conflict detection, and approval step scaffolding.
//          Emits domain events after each state change.
// Dependencies: RequestsRepository, EventEmitter2, @nestjs/common, @repo/database

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  prisma,
  RequestStatus,
  UserRole,
  ApprovalStage,
  ApprovalGroup,
  ApprovalStatus,
  RevisionType,
} from '@repo/database';

import { RequestsRepository }  from '../repositories/requests.repository';
import { CreateRequestDto }    from '../dto/create-request.dto';
import { UpdateRequestDto }    from '../dto/query-update.dto';
import { QueryRequestDto }     from '../dto/query-update.dto';

import { ROLE_TO_STAGE } from '../../approvals/domain/entities/approval-step.entity';

// Roles that can view ALL requests
const ADMIN_ROLES = new Set<UserRole>([
  UserRole.SCHOOL_ADMIN,
  UserRole.SUPER_ADMIN,
]);

// Roles that see requests assigned to them for approval
const APPROVER_ROLES = new Set<UserRole>([
  UserRole.ADVISER,
  UserRole.DEPARTMENT_HEAD,
  UserRole.MIS,
  UserRole.BUILDING_ADMIN,
  UserRole.STUDENT_AFFAIRS,
  UserRole.ACADEMIC_HEAD,
]);

// Statuses in which editing is still allowed
const EDITABLE_STATUSES = new Set<RequestStatus>([
  RequestStatus.DRAFT,
  RequestStatus.PENDING,
]);

// Statuses in which cancellation is allowed
const CANCELLABLE_STATUSES = new Set<RequestStatus>([
  RequestStatus.DRAFT,
  RequestStatus.PENDING,
]);

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    private readonly requestsRepo:  RequestsRepository,
    private readonly eventEmitter:  EventEmitter2,
  ) {}

  // ── Create (saves as DRAFT) ───────────────────────────────────────────────

  async create(userId: string, dto: CreateRequestDto) {
    this.logger.log(`[RequestsService] create — userId: ${userId}`);

    const bufferMinutes   = await this.getBufferMinutes();
    const prefix          = await this.getReferencePrefix();
    const referenceNumber = await this.requestsRepo.generateReferenceNumber(prefix);

    const request = await this.requestsRepo.create({
      referenceNumber,
      requestedById:        userId,
      activityTitle:        dto.activityTitle,
      theme:                dto.theme,
      objectives:           dto.objectives,
      activityStartAt:      new Date(dto.activityStartAt),
      activityEndAt:        new Date(dto.activityEndAt),
      venueDescription:     dto.venueDescription,
      equipmentDescription: dto.equipmentDescription,
      speakers:             dto.speakers ?? [],
      expectedAudience:     dto.expectedAudience,
      expectedHeadcount:    dto.expectedHeadcount,
      remarks:              dto.remarks,
      venues:               dto.venues ?? [],
      assets:               dto.assets ?? [],
      bufferMinutes,
      approvalGroup:        dto.approvalGroup,
    });

    this.eventEmitter.emit('request.created', {
      requestId: request.id,
      userId,
    });

    this.logger.log(`[RequestsService] created: ${request.referenceNumber}`);
    return request;
  }

  // ── Submit (DRAFT → PENDING + scaffold ApprovalSteps) ────────────────────

  async submit(
    requestId: string,
    userId:    string,
    userRole:  UserRole,
    adviserId: string,
  ) {
    this.logger.log(`[RequestsService] submit — requestId: ${requestId}, userId: ${userId}`);

    const raw = await this.requestsRepo.findRawById(requestId);
    if (!raw) throw new NotFoundException('Request not found');

    if (raw.requestedById !== userId) {
      throw new ForbiddenException('You can only submit your own requests');
    }

    if (raw.status !== RequestStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT requests can be submitted. Current status: ${raw.status}`,
      );
    }

    // Validate adviser
    const adviser = await prisma.user.findFirst({
      where: {
        id:        { equals: adviserId, not: userId },
        role:      UserRole.ADVISER,
        isActive:  true,
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    if (!adviser) {
      throw new BadRequestException(
        'Selected adviser not found, is inactive, or you cannot select yourself.',
      );
    }

    // Validate Department Head exists for approval group
    const deptHead = await prisma.user.findFirst({
      where: {
        role:           UserRole.DEPARTMENT_HEAD,
        approvalGroup:  raw.approvalGroup,
        isActive:       true,
        deletedAt:      null,
        id:             { not: userId },
      },
      select: { id: true, name: true },
    });

    if (!deptHead) {
      throw new BadRequestException(
        'No Department Head is currently assigned to the selected approval group. Please contact an administrator to configure one before submitting.',
      );
    }

    // Venue conflict check
    const request  = await this.requestsRepo.findById(requestId);
    const venueIds = request!.venueBookings?.map(b => b.venueId) ?? [];

    if (venueIds.length > 0) {
      const conflicts = await this.requestsRepo.findConflictingVenueBookings(
        venueIds,
        new Date(request!.activityStartAt),
        new Date(request!.activityEndAt),
        requestId,
      );

      if (conflicts.length > 0) {
        const names = conflicts.map(
          c => `${c.venue.name} (ref: ${c.request.referenceNumber})`,
        );
        throw new BadRequestException(
          `Venue conflict detected. The following venues are already reserved: ${names.join(', ')}`,
        );
      }
    }

    const approverMap = await this.resolveApprovers(
      adviserId,
      userId,
      raw.approvalGroup,
    );

    const submitted = await this.requestsRepo.submitRequest(requestId, approverMap);

    this.eventEmitter.emit('request.submitted', {
      requestId,
      userId,
      referenceNumber: submitted.referenceNumber,
    });

    this.logger.log(`[RequestsService] submitted: ${submitted.referenceNumber}`);
    return submitted;
  }

  // ── NEW: Resubmit (REVISION_REQUESTED → resume or restart) ────────────────

  async resubmit(requestId: string, userId: string) {
    this.logger.log(`[RequestsService] resubmit — requestId: ${requestId}, userId: ${userId}`);

    const request = await this.requestsRepo.findForResubmit(requestId);
    if (!request) throw new NotFoundException('Request not found');

    // Only the requestor can resubmit
    if (request.requestedById !== userId) {
      throw new ForbiddenException('You can only resubmit your own requests');
    }

    if (request.status !== RequestStatus.REVISION_REQUESTED) {
      throw new BadRequestException(
        `Only requests in REVISION_REQUESTED status can be resubmitted. Current status: ${request.status}`,
      );
    }

    // Find the step that triggered the revision
    const triggeringStep = request.approvalSteps.find(
      s => s.status === ApprovalStatus.REVISION_REQUESTED,
    );

    if (!triggeringStep) {
      throw new BadRequestException(
        'No revision-requested step found. The request may be in an inconsistent state.',
      );
    }

    if (!triggeringStep.revisionType) {
      throw new BadRequestException(
        'Revision type not found on the triggering step.',
      );
    }

    let resubmitted;

    if (triggeringStep.revisionType === RevisionType.REVISION_RESUME) {
      // ── RESUME: Reset triggering step + suspended steps, restore previous status ─
      resubmitted = await this.requestsRepo.resubmitResume(requestId);

      this.eventEmitter.emit('request.resubmitted', {
        requestId,
        userId,
        revisionType: RevisionType.REVISION_RESUME,
        referenceNumber: resubmitted.referenceNumber,
      });

      this.logger.log(
        `[RequestsService] resumed: ${resubmitted.referenceNumber} → ${resubmitted.status}`,
      );

    } else if (triggeringStep.revisionType === RevisionType.REVISION_RESTART) {
      // ── RESTART: Full restart, retain adviser if still eligible ──────────────

      // 1. Capture the current adviser
      const currentAdviserStep = request.approvalSteps.find(
        s => s.stage === ApprovalStage.STAGE_1_ADVISER,
      );
      const retainedAdviserId = currentAdviserStep?.approverId ?? null;
      // 2. Validate retained adviser is still eligible
      let adviserId: string | null = null;
      if (retainedAdviserId) {
        const stillEligible = await prisma.user.findFirst({
          where: {
            id:        retainedAdviserId,
            role:      UserRole.ADVISER,
            isActive:  true,
            deletedAt: null,
            // Cannot be the requestor themselves
            NOT: { id: userId },
          },
          select: { id: true },
        });
        adviserId = stillEligible?.id ?? null;
      }

      // 3. Resolve all approvers (adviser may be null → role fallback)
      const approverMap = await this.resolveApprovers(
        adviserId,
        userId,
        request.approvalGroup as ApprovalGroup,
      );

      // 4. Execute restart transaction
      resubmitted = await this.requestsRepo.resubmitRestart(requestId, approverMap);

      // 5. Update revision metadata
      await prisma.request.update({
        where: { id: requestId },
        data: {
          revisionCount: { increment: 1 },
          revisedAt:     new Date(),
        },
      });

      this.eventEmitter.emit('request.resubmitted', {
        requestId,
        userId,
        revisionType: RevisionType.REVISION_RESTART,
        referenceNumber: resubmitted.referenceNumber,
      });

      this.logger.log(
        `[RequestsService] restarted: ${resubmitted.referenceNumber} (adviser: ${adviserId ?? 'role fallback'})`,
      );
    }

    return resubmitted;
  }

  // ── Find many (role-scoped) ───────────────────────────────────────────────

  async findMany(userId: string, userRole: UserRole, query: QueryRequestDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;
    const skip  = (page - 1) * limit;

    let requestedById:      string | undefined;
    let assignedApproverId: string | undefined;

    if (ADMIN_ROLES.has(userRole)) {
      // Admins see everything
    } else if (query.viewMode === 'my_requests') {
      requestedById = userId;
    } else if (query.viewMode === 'for_my_review' && APPROVER_ROLES.has(userRole)) {
      assignedApproverId = userId;
    } else {
      requestedById = userId;
    }

    const { data, total } = await this.requestsRepo.findMany({
      skip,
      take:   limit,
      status: query.status,
      dateFrom: query.dateFrom,
      dateTo:   query.dateTo,
      search:   query.search,
      requestedById,
      assignedApproverId,
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

  // ── Find one ──────────────────────────────────────────────────────────────

  async findOne(requestId: string, userId: string, userRole: UserRole) {
    const request = await this.requestsRepo.findById(requestId);
    if (!request) throw new NotFoundException('Request not found');

    if (ADMIN_ROLES.has(userRole)) return request;
    if (request.requestedById === userId) return request;

    const isAssignedApprover = request.approvalSteps?.some(
      s => s.approverId === userId,
    ) ?? false;

    if (isAssignedApprover) return request;

    const assignedStage = ROLE_TO_STAGE[userRole] ?? null;
    if (assignedStage) {
      const hasMatchingUnassignedStep = request.approvalSteps?.some(
        s => s.approverId === null && s.stage === assignedStage,
      ) ?? false;

      if (hasMatchingUnassignedStep) return request;
    }

    throw new ForbiddenException('You do not have access to this request');
  }

  // ── Update (DRAFT or PENDING only) ───────────────────────────────────────

  async update(requestId: string, userId: string, userRole: UserRole, dto: UpdateRequestDto) {
    this.logger.log(`[RequestsService] update — requestId: ${requestId}`);

    const raw = await this.requestsRepo.findRawById(requestId);
    if (!raw) throw new NotFoundException('Request not found');

    if (raw.requestedById !== userId && !ADMIN_ROLES.has(userRole)) {
      throw new ForbiddenException('You can only edit your own requests');
    }

    if (!EDITABLE_STATUSES.has(raw.status)) {
      throw new BadRequestException(
        `Requests can only be edited in DRAFT or PENDING status. ` +
        `Current status: ${raw.status}. ` +
        `Once a request reaches Stage 1 Review, you must cancel and refile.`,
      );
    }

    const bufferMinutes = await this.getBufferMinutes();
    const isPending     = raw.status === RequestStatus.PENDING;

    const updated = await this.requestsRepo.update(requestId, {
      activityTitle:        dto.activityTitle,
      theme:                dto.theme,
      objectives:           dto.objectives,
      activityStartAt:      dto.activityStartAt ? new Date(dto.activityStartAt) : undefined,
      activityEndAt:        dto.activityEndAt   ? new Date(dto.activityEndAt)   : undefined,
      venueDescription:     dto.venueDescription,
      equipmentDescription: dto.equipmentDescription,
      speakers:             dto.speakers,
      expectedAudience:     dto.expectedAudience,
      expectedHeadcount:    dto.expectedHeadcount,
      remarks:              dto.remarks,
      venues:               dto.venues,
      assets:               dto.assets,
      bufferMinutes,
      resetApprovalSteps: isPending,
    });

    this.eventEmitter.emit('request.updated', {
      requestId,
      userId,
      wasReset: isPending,
    });

    this.logger.log(`[RequestsService] updated: ${requestId} (stepsReset: ${isPending})`);
    return updated;
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  async cancel(requestId: string, userId: string, userRole: UserRole) {
    this.logger.log(`[RequestsService] cancel — requestId: ${requestId}`);

    const raw = await this.requestsRepo.findRawById(requestId);
    if (!raw) throw new NotFoundException('Request not found');

    if (raw.requestedById !== userId && !ADMIN_ROLES.has(userRole)) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    if (!CANCELLABLE_STATUSES.has(raw.status)) {
      throw new BadRequestException(
        `Only DRAFT or PENDING requests can be cancelled. Current status: ${raw.status}`,
      );
    }

    await this.requestsRepo.cancel(requestId);

    this.eventEmitter.emit('request.cancelled', {
      requestId,
      userId,
    });

    this.logger.log(`[RequestsService] cancelled: ${requestId}`);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async resolveApprovers(
    adviserId:     string | null,
    requestedById: string,
    approvalGroup: ApprovalGroup,
  ): Promise<Record<ApprovalStage, string | null>> {
    const result = {} as Record<ApprovalStage, string | null>;

    // Adviser: use retained if eligible, otherwise null (role fallback)
    result[ApprovalStage.STAGE_1_ADVISER] = adviserId;

    // Department Head: matched by approvalGroup + role
    const deptHead = await prisma.user.findFirst({
      where: {
        role:           UserRole.DEPARTMENT_HEAD,
        approvalGroup:  approvalGroup,
        isActive:       true,
        deletedAt:      null,
        id:             { not: requestedById },
      },
      select: { id: true },
    });
    result[ApprovalStage.STAGE_1_DEPT_HEAD] = deptHead?.id ?? null;

    // All other stages: role-only matching
    const remainingStages: { role: UserRole; stage: ApprovalStage }[] = [
      { role: UserRole.ACADEMIC_HEAD,   stage: ApprovalStage.STAGE_2_ACADEMIC_HEAD           },
      { role: UserRole.STUDENT_AFFAIRS, stage: ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS },
      { role: UserRole.MIS,             stage: ApprovalStage.STAGE_2_MIS                     },
      { role: UserRole.BUILDING_ADMIN,  stage: ApprovalStage.STAGE_2_BUILDING                },
      { role: UserRole.SCHOOL_ADMIN,    stage: ApprovalStage.STAGE_3_SCHOOL_ADMIN            },
    ];

    for (const { role, stage } of remainingStages) {
      const user = await prisma.user.findFirst({
        where: {
          role,
          isActive:  true,
          deletedAt: null,
          id:        { not: requestedById },
        },
        select: { id: true },
      });
      result[stage] = user?.id ?? null;
    }

    return result;
  }

  private async getBufferMinutes(): Promise<number> {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'reservation_buffer_min' },
    });
    return parseInt(config?.value ?? '30', 10);
  }

  private async getReferencePrefix(): Promise<string> {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'reference_number_prefix' },
    });
    return config?.value ?? 'RACA';
  }
}