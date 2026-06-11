// File: apps/backend/src/modules/requests/services/requests.service.ts
// CHANGED: inject PrismaService, remove direct prisma import
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  RequestStatus,
  UserRole,
  ApprovalStage,
} from '@repo/database';

import { PrismaService }       from '../../../prisma.service';
import { RequestsRepository }  from '../repositories/requests.repository';
import { CreateRequestDto }    from '../dto/create-request.dto';
import { UpdateRequestDto }    from '../dto/query-update.dto';
import { QueryRequestDto }     from '../dto/query-update.dto';

const ADMIN_ROLES = new Set<UserRole>([
  UserRole.SCHOOL_ADMIN,
  UserRole.SUPER_ADMIN,
]);

const EDITABLE_STATUSES = new Set<RequestStatus>([
  RequestStatus.DRAFT,
  RequestStatus.PENDING,
]);

const CANCELLABLE_STATUSES = new Set<RequestStatus>([
  RequestStatus.DRAFT,
  RequestStatus.PENDING,
]);

const APPROVER_ROLES = new Set<UserRole>([
  UserRole.ADVISER,
  UserRole.DEPARTMENT_HEAD,
  UserRole.MIS,
  UserRole.BUILDING_ADMIN,
  UserRole.STUDENT_AFFAIRS,
  UserRole.ACADEMIC_HEAD,
  UserRole.SCHOOL_ADMIN,
]);

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    private readonly requestsRepo: RequestsRepository,
    private readonly eventEmitter:  EventEmitter2,
    private readonly prisma:        PrismaService, // CHANGED: inject PrismaService
  ) {}

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
    });

    this.eventEmitter.emit('request.created', { requestId: request.id, userId });
    this.logger.log(`[RequestsService] created: ${request.referenceNumber}`);
    return request;
  }

  async submit(requestId: string, userId: string, userRole: UserRole) {
    this.logger.log(`[RequestsService] submit — requestId: ${requestId}`);

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
        const names = conflicts.map(c => `${c.venue.name} (ref: ${c.request.referenceNumber})`);
        throw new BadRequestException(
          `Venue conflict detected: ${names.join(', ')}`,
        );
      }
    }

    const approverMap = await this.resolveApprovers();
    const submitted   = await this.requestsRepo.submitRequest(requestId, approverMap);

    this.eventEmitter.emit('request.submitted', {
      requestId,
      userId,
      referenceNumber: submitted.referenceNumber,
    });

    this.logger.log(`[RequestsService] submitted: ${submitted.referenceNumber}`);
    return submitted;
  }

  async findMany(userId: string, userRole: UserRole, query: QueryRequestDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;
    const skip  = (page - 1) * limit;

    const isAdmin    = ADMIN_ROLES.has(userRole);
    const isApprover = APPROVER_ROLES.has(userRole);

    let requestedById: string | undefined;
    let assignedApproverId: string | undefined;

    if (isAdmin) {
      // Admins see everything — no filter
      requestedById      = undefined;
      assignedApproverId = undefined;
    } else if (isApprover && query.viewAs === 'approver') {
      // CHANGED: approver viewing "For My Review" —
      // show requests where they have an approval step
      requestedById      = undefined;
      assignedApproverId = userId;
    } else {
      // Everyone else (and approvers viewing "My Requests") —
      // show only their own requests
      requestedById      = userId;
      assignedApproverId = undefined;
    }

    const { data, total } = await this.requestsRepo.findMany({
      skip,
      take:              limit,
      status:            query.status,
      dateFrom:          query.dateFrom,
      dateTo:            query.dateTo,
      search:            query.search,
      requestedById,
      assignedApproverId, // CHANGED: new filter
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

  async findOne(requestId: string, userId: string, userRole: UserRole) {
    const request = await this.requestsRepo.findById(requestId);
    if (!request) throw new NotFoundException('Request not found');

    // Admin roles see everything
    if (ADMIN_ROLES.has(userRole)) return request;

    // Owner sees their own
    if (request.requestedById === userId) return request;

    // CHANGED: approvers can view requests where they have a step assigned
    const isApprover = request.approvalSteps?.some(
      (s: { approverId: string | null }) => s.approverId === userId,
    );
    if (isApprover) return request;

    throw new ForbiddenException('You do not have access to this request');
  }

  async update(requestId: string, userId: string, userRole: UserRole, dto: UpdateRequestDto) {
    this.logger.log(`[RequestsService] update — requestId: ${requestId}`);

    const raw = await this.requestsRepo.findRawById(requestId);
    if (!raw) throw new NotFoundException('Request not found');

    if (raw.requestedById !== userId && !ADMIN_ROLES.has(userRole)) {
      throw new ForbiddenException('You can only edit your own requests');
    }

    if (!EDITABLE_STATUSES.has(raw.status)) {
      throw new BadRequestException(
        `Requests can only be edited in DRAFT or PENDING status. Current status: ${raw.status}.`,
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

    this.eventEmitter.emit('request.updated', { requestId, userId, wasReset: isPending });
    this.logger.log(`[RequestsService] updated: ${requestId}`);
    return updated;
  }

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
    this.eventEmitter.emit('request.cancelled', { requestId, userId });
    this.logger.log(`[RequestsService] cancelled: ${requestId}`);
  }

  private async resolveApprovers(): Promise<Record<ApprovalStage, string | null>> {
    const roleToStage: { role: UserRole; stage: ApprovalStage }[] = [
      { role: UserRole.ADVISER,         stage: ApprovalStage.STAGE_1_ADVISER                 },
      { role: UserRole.DEPARTMENT_HEAD, stage: ApprovalStage.STAGE_1_DEPT_HEAD               },
      { role: UserRole.MIS,             stage: ApprovalStage.STAGE_2_MIS                     },
      { role: UserRole.BUILDING_ADMIN,  stage: ApprovalStage.STAGE_2_BUILDING                },
      { role: UserRole.STUDENT_AFFAIRS, stage: ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS },
      { role: UserRole.ACADEMIC_HEAD,   stage: ApprovalStage.STAGE_2_ACADEMIC_HEAD           },
      { role: UserRole.SCHOOL_ADMIN,    stage: ApprovalStage.STAGE_3_SCHOOL_ADMIN            },
    ];

    const result = {} as Record<ApprovalStage, string | null>;

    for (const { role, stage } of roleToStage) {
      const user = await this.prisma.user.findFirst({
        where:  { role, isActive: true, deletedAt: null },
        select: { id: true },
      });
      result[stage] = user?.id ?? null;
    }

    return result;
  }

  private async getBufferMinutes(): Promise<number> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'reservation_buffer_min' },
    });
    return parseInt(config?.value ?? '30', 10);
  }

  private async getReferencePrefix(): Promise<string> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'reference_number_prefix' },
    });
    return config?.value ?? 'RACA';
  }
}