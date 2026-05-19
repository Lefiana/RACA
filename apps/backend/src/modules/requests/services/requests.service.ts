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
} from '@repo/database';

import { RequestsRepository }  from '../repositories/requests.repository';
import { CreateRequestDto }    from '../dto/create-request.dto';
import { UpdateRequestDto }    from '../dto/query-update.dto';
import { QueryRequestDto }     from '../dto/query-update.dto';

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

    const bufferMinutes = await this.getBufferMinutes();
    const prefix        = await this.getReferencePrefix();
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
    });

    this.eventEmitter.emit('request.created', {
      requestId: request.id,
      userId,
    });

    this.logger.log(`[RequestsService] created: ${request.referenceNumber}`);
    return request;
  }

  // ── Submit (DRAFT → PENDING + scaffold ApprovalSteps) ────────────────────

  async submit(requestId: string, userId: string, userRole: UserRole) {
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

    // ── Venue conflict check ─────────────────────────────────────────────────
    // Checks for isLocked bookings that overlap with this request's time window.
    // We do this before scaffolding steps so no partial state is written on conflict.
    const request = await this.requestsRepo.findById(requestId);
    const venueIds = request!.venueBookings?.map(b => b.venueId) ?? [];

    if (venueIds.length > 0) {
      const conflicts = await this.requestsRepo.findConflictingVenueBookings(
        venueIds,
        new Date(request!.activityStartAt),
        new Date(request!.activityEndAt),
        requestId,
      );

      if (conflicts.length > 0) {
        const names = conflicts.map(c => `${c.venue.name} (ref: ${c.request.referenceNumber})`);
        throw new BadRequestException(
          `Venue conflict detected. The following venues are already reserved: ${names.join(', ')}`,
        );
      }
    }

    // ── Resolve approvers ────────────────────────────────────────────────────
    // Find users for each role in the approval chain and map them to their stage.
    // If no user has that role, approverId is null — the step is still created
    // and will be manually assigned or notified by the admin.
    const approverMap = await this.resolveApprovers();

    // ── Scaffold steps + transition status ───────────────────────────────────
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

    // ADMIN roles see everything. REQUESTOR sees only their own.
    // APPROVER roles see requests where they are an approver — handled
    // here by scoping to their own requests for now; the Approvals module
    // will add the "assigned to me" view.
    const requestedById = ADMIN_ROLES.has(userRole) ? undefined : userId;

    const { data, total } = await this.requestsRepo.findMany({
      skip,
      take:   limit,
      status: query.status,
      dateFrom: query.dateFrom,
      dateTo:   query.dateTo,
      search:   query.search,
      requestedById,
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

  // ── Find one ─────────────────────────────────────────────────────────────

  async findOne(requestId: string, userId: string, userRole: UserRole) {
    const request = await this.requestsRepo.findById(requestId);
    if (!request) throw new NotFoundException('Request not found');

    // Non-admin users can only view their own requests
    // (Approvals module will extend visibility for approver roles)
    if (!ADMIN_ROLES.has(userRole) && request.requestedById !== userId) {
      throw new ForbiddenException('You do not have access to this request');
    }

    return request;
  }

  // ── Update (DRAFT or PENDING only) ───────────────────────────────────────

  async update(requestId: string, userId: string, userRole: UserRole, dto: UpdateRequestDto) {
    this.logger.log(`[RequestsService] update — requestId: ${requestId}`);

    const raw = await this.requestsRepo.findRawById(requestId);
    if (!raw) throw new NotFoundException('Request not found');

    // Ownership check
    if (raw.requestedById !== userId && !ADMIN_ROLES.has(userRole)) {
      throw new ForbiddenException('You can only edit your own requests');
    }

    // Edit window enforcement
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
      // Reset approval steps when editing a PENDING request —
      // the content changed so the adviser must review again from scratch
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

  // Finds one user per role to serve as the approver for each stage.
  // Returns null for a stage if no user has that role yet.
  private async resolveApprovers(): Promise<Record<ApprovalStage, string | null>> {
    const roleToStage: { role: UserRole; stage: ApprovalStage }[] = [
      { role: UserRole.ADVISER,          stage: ApprovalStage.STAGE_1_ADVISER                  },
      { role: UserRole.DEPARTMENT_HEAD,  stage: ApprovalStage.STAGE_1_DEPT_HEAD                },
      { role: UserRole.MIS,              stage: ApprovalStage.STAGE_2_MIS                      },
      { role: UserRole.BUILDING_ADMIN,   stage: ApprovalStage.STAGE_2_BUILDING                 },
      { role: UserRole.STUDENT_AFFAIRS,  stage: ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS  },
      { role: UserRole.ACADEMIC_HEAD,    stage: ApprovalStage.STAGE_2_ACADEMIC_HEAD            },
      { role: UserRole.SCHOOL_ADMIN,     stage: ApprovalStage.STAGE_3_SCHOOL_ADMIN             },
    ];

    const result = {} as Record<ApprovalStage, string | null>;

    for (const { role, stage } of roleToStage) {
      const user = await prisma.user.findFirst({
        where:  { role, isActive: true, deletedAt: null },
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