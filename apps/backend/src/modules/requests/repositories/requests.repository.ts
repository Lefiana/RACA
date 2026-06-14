// File: apps/backend/src/modules/requests/repositories/requests.repository.ts
// Purpose: All Prisma queries for requests, venue bookings, asset checkouts,
//          and approval step scaffolding. The service layer never calls
//          prisma directly — all DB access goes through this repository.
// Dependencies: @repo/database, @nestjs/common

import { Injectable } from '@nestjs/common';
import {
  prisma,
  Prisma,
  RequestStatus,
  ApprovalStatus,
  ApprovalStage,
  ApprovalGroup,
} from '@repo/database';

// The full include shape used for single-request queries.
// Defined once here so the service and controller get consistent data.
const REQUEST_FULL_INCLUDE = {
  requestedBy: {
    select: {
      id: true, name: true, email: true,
      username: true, department: true,
    },
  },
  venueBookings: {
    include: { venue: { select: { id: true, name: true, capacity: true } } },
  },
  assetCheckouts: {
    include: { asset: { select: { id: true, name: true, assetTag: true, category: true } } },
  },
  approvalSteps: {
    orderBy: { stepOrder: 'asc' as const },
  },
  attachments: true,
} satisfies Prisma.RequestInclude;

@Injectable()
export class RequestsRepository {

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findById(id: string) {
    return prisma.request.findFirst({
      where:   { id, deletedAt: null },
      include: REQUEST_FULL_INCLUDE,
    });
  }

  async findMany(params: {
    skip:          number;
    take:          number;
    status?:       RequestStatus;
    dateFrom?:     string;
    dateTo?:       string;
    search?:       string;
    requestedById?:      string;
    assignedApproverId?: string;
  }) {
    const {
      skip, take, status, dateFrom, dateTo,
      search, requestedById, assignedApproverId,
    } = params;

    const where: Prisma.RequestWhereInput = {
      deletedAt: null,
      ...(assignedApproverId
        ? {
            approvalSteps: {
              some: { approverId: assignedApproverId },
            },
          }
        : requestedById
          ? { requestedById }
          : {}
      ),
      ...(status && { status }),
      ...((dateFrom || dateTo) && {
        activityStartAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo   && { lte: new Date(dateTo)   }),
        },
      }),
      ...(search && {
        OR: [
          { activityTitle:   { contains: search, mode: 'insensitive' } },
          { referenceNumber: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.request.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          requestedBy: {
            select: { id: true, name: true, department: true },
          },
          approvalSteps: {
            select: { stage: true, status: true, stepOrder: true },
            orderBy: { stepOrder: 'asc' },
          },
          venueBookings: {
            include: { venue: { select: { id: true, name: true } } },
          },
        },
      }),
      prisma.request.count({ where }),
    ]);

    return { data, total };
  }

  async findConflictingVenueBookings(
    venueIds: string[],
    startAt:  Date,
    endAt:    Date,
    excludeRequestId?: string,
  ) {
    return prisma.venueBooking.findMany({
      where: {
        venueId:   { in: venueIds },
        isLocked:  true,
        bufferStartAt: { lt: endAt   },
        bufferEndAt:   { gt: startAt },
        ...(excludeRequestId && {
          requestId: { not: excludeRequestId },
        }),
      },
      include: {
        venue:   { select: { id: true, name: true } },
        request: { select: { referenceNumber: true } },
      },
    });
  }

  async generateReferenceNumber(prefix: string): Promise<string> {
    const today    = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');

    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay   = new Date(today.setHours(23, 59, 59, 999));

    const count = await prisma.request.count({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}-${datePart}-${sequence}`;
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  async create(data: {
    referenceNumber:      string;
    requestedById:        string;
    activityTitle:        string;
    theme?:               string;
    objectives:           string;
    activityStartAt:      Date;
    activityEndAt:        Date;
    venueDescription?:    string;
    equipmentDescription?: string;
    speakers:             any[];
    expectedAudience?:    string;
    expectedHeadcount?:   number;
    remarks?:             string;
    venues: { venueId: string }[];
    assets: { assetId: string; quantity: number }[];
    bufferMinutes: number;
    approvalGroup: ApprovalGroup;
  }) {
    const {
      venues, assets, bufferMinutes,
      activityStartAt, activityEndAt,
      approvalGroup,
      ...requestData
    } = data;

    const bufferMs      = bufferMinutes * 60 * 1000;
    const bufferStartAt = new Date(activityStartAt.getTime() - bufferMs);
    const bufferEndAt   = new Date(activityEndAt.getTime()   + bufferMs);

    return prisma.request.create({
      data: {
        ...requestData,
        activityStartAt,
        activityEndAt,
        approvalGroup,
        status: RequestStatus.DRAFT,
        venueBookings: venues.length > 0 ? {
          create: venues.map(v => ({
            venueId:      v.venueId,
            startAt:      activityStartAt,
            endAt:        activityEndAt,
            bufferStartAt,
            bufferEndAt,
            isLocked:     false,
          })),
        } : undefined,
        assetCheckouts: assets.length > 0 ? {
          create: assets.map(a => ({
            assetId:  a.assetId,
            quantity: a.quantity,
          })),
        } : undefined,
      },
      include: REQUEST_FULL_INCLUDE,
    });
  }

  async update(id: string, data: {
    activityTitle?:        string;
    theme?:                string;
    objectives?:           string;
    activityStartAt?:      Date;
    activityEndAt?:        Date;
    venueDescription?:     string;
    equipmentDescription?: string;
    speakers?:             any[];
    expectedAudience?:     string;
    expectedHeadcount?:    number;
    remarks?:              string;
    venues?: { venueId: string }[];
    assets?: { assetId: string; quantity: number }[];
    bufferMinutes?: number;
    resetApprovalSteps: boolean;
  }) {
    const {
      venues, assets, bufferMinutes,
      resetApprovalSteps,
      activityStartAt, activityEndAt,
      ...updateFields
    } = data;

    return prisma.$transaction(async (tx) => {
      const needsRebookVenues =
        venues !== undefined ||
        activityStartAt !== undefined ||
        activityEndAt !== undefined;

      if (needsRebookVenues && venues !== undefined) {
        await tx.venueBooking.deleteMany({ where: { requestId: id } });

        if (venues.length > 0 && activityStartAt && activityEndAt) {
          const bufferMs      = (bufferMinutes ?? 30) * 60 * 1000;
          const bufferStartAt = new Date(activityStartAt.getTime() - bufferMs);
          const bufferEndAt   = new Date(activityEndAt.getTime()   + bufferMs);

          await tx.venueBooking.createMany({
            data: venues.map(v => ({
              requestId: id,
              venueId:   v.venueId,
              startAt:   activityStartAt,
              endAt:     activityEndAt,
              bufferStartAt,
              bufferEndAt,
              isLocked:  false,
            })),
          });
        }
      }

      if (assets !== undefined) {
        await tx.assetCheckout.deleteMany({ where: { requestId: id } });
        if (assets.length > 0) {
          await tx.assetCheckout.createMany({
            data: assets.map(a => ({
              requestId: id,
              assetId:   a.assetId,
              quantity:  a.quantity,
            })),
          });
        }
      }

      if (resetApprovalSteps) {
        await tx.approvalStep.updateMany({
          where: { requestId: id },
          data: {
            status:          ApprovalStatus.PENDING,
            decidedAt:       null,
            remarks:         null,
            rejectionReason: null,
            approverName:    null,
            approverRole:    null,
            approverTitle:   null,
          },
        });
      }

      return tx.request.update({
        where: { id },
        data:  {
          ...updateFields,
          ...(activityStartAt && { activityStartAt }),
          ...(activityEndAt   && { activityEndAt   }),
          updatedAt: new Date(),
        },
        include: REQUEST_FULL_INCLUDE,
      });
    });
  }

  async submitRequest(id: string, approverMap: Record<ApprovalStage, string | null>) {
    return prisma.$transaction(async (tx) => {
      const steps: { stage: ApprovalStage; stepOrder: number; title: string }[] = [
        { stage: ApprovalStage.STAGE_1_ADVISER,                  stepOrder: 1, title: 'Adviser'                  },
        { stage: ApprovalStage.STAGE_1_DEPT_HEAD,                stepOrder: 2, title: 'Department Head'          },
        { stage: ApprovalStage.STAGE_2_ACADEMIC_HEAD,            stepOrder: 3, title: 'Academic Head'            },
        { stage: ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS,  stepOrder: 4, title: 'Head of Student Affairs'  },
        { stage: ApprovalStage.STAGE_2_MIS,                      stepOrder: 5, title: 'MIS'                      },
        { stage: ApprovalStage.STAGE_2_BUILDING,                 stepOrder: 6, title: 'Building Administrator'   },
        { stage: ApprovalStage.STAGE_3_SCHOOL_ADMIN,             stepOrder: 7, title: 'School Administrator'     },
      ];

      await tx.approvalStep.createMany({
        data: steps.map(step => ({
          requestId:     id,
          stage:         step.stage,
          stepOrder:     step.stepOrder,
          approverTitle: step.title,
          approverId:    approverMap[step.stage] ?? null,
          status:        ApprovalStatus.PENDING,
        })),
        skipDuplicates: true,
      });

      return tx.request.update({
        where: { id },
        data: {
          status:      RequestStatus.PENDING,
          submittedAt: new Date(),
        },
        include: REQUEST_FULL_INCLUDE,
      });
    });
  }

  async cancel(id: string) {
    return prisma.request.update({
      where: { id },
      data: {
        status:    RequestStatus.CANCELLED,
        deletedAt: new Date(),
      },
    });
  }

  async findRawById(id: string) {
    return prisma.request.findFirst({
      where: { id, deletedAt: null },
      select: {
        id:            true,
        status:        true,
        requestedById: true,
        approvalGroup: true,
        venueBookings: {
          select: { venueId: true },
        },
      },
    });
  }
}