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
} from '@repo/database';

import { RequestsRepository }  from '../repositories/requests.repository';
import { CreateRequestDto }    from '../dto/create-request.dto';
import { UpdateRequestDto }    from '../dto/query-update.dto';
import { QueryRequestDto }     from '../dto/query-update.dto';

// CHANGED (H3): Import ROLE_TO_STAGE for role-fallback approver visibility check
import { ROLE_TO_STAGE } from '../../approvals/domain/entities/approval-step.entity';

// Roles that can view ALL requests (not just their own)
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

    // Only the requestor can submit their own request
    if (raw.requestedById !== userId) {
      throw new ForbiddenException('You can only submit your own requests');
    }

    if (raw.status !== RequestStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT requests can be submitted. Current status: ${raw.status}`,
      );
    }

    // ── Validate the selected adviser exists, is active, holds
    // the ADVISER role, and is not the requestor themselves (H2 guard).
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

    // ── NEW: Department Head must exist for the selected approval group
    // This is a hard block — the request stays in DRAFT status.
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

    // ── Venue conflict check ──────────────────────────────────────────────
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

    // Pass adviserId explicitly, requestedById to exclude requestor,
    // and approvalGroup for Department Head routing.
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

  // ── Find many (role-scoped) ───────────────────────────────────────────────

  async findMany(userId: string, userRole: UserRole, query: QueryRequestDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;
    const skip  = (page - 1) * limit;

    let requestedById:      string | undefined;
    let assignedApproverId: string | undefined;

    if (ADMIN_ROLES.has(userRole)) {
      // Admins see everything — no scoping
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

    // Path 1: Admin roles always have full visibility.
    if (ADMIN_ROLES.has(userRole)) return request;

    // Path 2: The requestor who owns the request.
    if (request.requestedById === userId) return request;

    // Path 3: Explicitly assigned approver — approverId matches on any step.
    const isAssignedApprover = request.approvalSteps?.some(
      s => s.approverId === userId,
    ) ?? false;

    if (isAssignedApprover) return request;

    // Path 4: Role-fallback approver — unassigned step exists for this user's stage.
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

  // CHANGED: resolveApprovers now matches Department Head by approvalGroup.
  // All other stages still use role-only matching.
  private async resolveApprovers(
    adviserId:     string,
    requestedById: string,
    approvalGroup: ApprovalGroup,
  ): Promise<Record<ApprovalStage, string | null>> {
    const result = {} as Record<ApprovalStage, string | null>;

    // Adviser is always the explicitly selected one.
    result[ApprovalStage.STAGE_1_ADVISER] = adviserId;

    // Department Head: matched by approvalGroup + role, excluded if it's the requestor.
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

    // All other stages: role-only matching, exclude requestor.
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