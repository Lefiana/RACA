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
    skip:         number;
    take:         number;
    status?:      RequestStatus;
    dateFrom?:    string;
    dateTo?:      string;
    search?:      string;
    // When provided, restricts results to requests owned by this user.
    // Omit for admin roles who can see everything.
    requestedById?: string;
  }) {
    const { skip, take, status, dateFrom, dateTo, search, requestedById } = params;

    const where: Prisma.RequestWhereInput = {
      deletedAt: null,
      ...(requestedById && { requestedById }),
      ...(status         && { status }),
      ...(dateFrom || dateTo) && {
        activityStartAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo   && { lte: new Date(dateTo)   }),
        },
      },
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
          // Only return step statuses in the list view — not full step detail
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

  // Checks for venue booking conflicts (isLocked = true) in the same window.
  // Used during submit to reject conflicting requests before they enter the chain.
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
        // Overlap condition: existing booking overlaps with requested window
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

  // Generates the next reference number for today.
  // Format: RACA-YYYYMMDD-XXXX (e.g. RACA-20250615-0001)
  // Counts today's requests and zero-pads the sequence.
  async generateReferenceNumber(prefix: string): Promise<string> {
    const today    = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

    // Count requests already created today to get the next sequence number
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

  // Creates the Request row + VenueBooking rows + AssetCheckout rows
  // in a single transaction. Status is always DRAFT at creation.
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
  }) {
    const {
      venues, assets, bufferMinutes,
      activityStartAt, activityEndAt,
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

  // Updates a DRAFT or PENDING request.
  // Resets all approval steps to PENDING when editing a PENDING request
  // since content has changed and the adviser must re-review.
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
      // If dates changed, rebuild venue bookings
      const needsRebookVenues =
        venues !== undefined ||
        activityStartAt !== undefined ||
        activityEndAt !== undefined;

      if (needsRebookVenues && venues !== undefined) {
        // Remove existing venue bookings and recreate
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

      // Rebuild asset checkouts if changed
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

      // Reset all approval steps when editing a PENDING request
      // The adviser needs to re-review from scratch because content changed
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

  // Scaffolds all 7 ApprovalStep rows in one transaction when submitting.
  // Each step is created in PENDING state with the correct stage and order.
  // approverId is set where a user with that role exists in the system —
  // the Approvals module will handle finding/notifying the right person.
  async submitRequest(id: string, approverMap: Record<ApprovalStage, string | null>) {
    return prisma.$transaction(async (tx) => {
      // Define the full ordered chain
      const steps: { stage: ApprovalStage; stepOrder: number; title: string }[] = [
        { stage: ApprovalStage.STAGE_1_ADVISER,                  stepOrder: 1, title: 'Adviser'                  },
        { stage: ApprovalStage.STAGE_1_DEPT_HEAD,                stepOrder: 2, title: 'Department Head'          },
        { stage: ApprovalStage.STAGE_2_MIS,                      stepOrder: 3, title: 'MIS'                      },
        { stage: ApprovalStage.STAGE_2_BUILDING,                 stepOrder: 4, title: 'Building Administrator'   },
        { stage: ApprovalStage.STAGE_2_HEAD_OF_STUDENT_AFFAIRS,  stepOrder: 5, title: 'Head of Student Affairs'  },
        { stage: ApprovalStage.STAGE_2_ACADEMIC_HEAD,            stepOrder: 6, title: 'Academic Head'            },
        { stage: ApprovalStage.STAGE_3_SCHOOL_ADMIN,             stepOrder: 7, title: 'School Administrator'     },
      ];

      // Create all 7 steps
      await tx.approvalStep.createMany({
        data: steps.map(step => ({
          requestId:     id,
          stage:         step.stage,
          stepOrder:     step.stepOrder,
          approverTitle: step.title,
          approverId:    approverMap[step.stage] ?? null,
          status:        ApprovalStatus.PENDING,
        })),
        skipDuplicates: true, // safe re-submit guard (edit → re-submit)
      });

      // Transition to PENDING
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

  // Soft cancellation — sets deletedAt and status = CANCELLED
  async cancel(id: string) {
    return prisma.request.update({
      where: { id },
      data: {
        status:    RequestStatus.CANCELLED,
        deletedAt: new Date(),
      },
    });
  }

  // Used by the service to verify ownership and editability
  async findRawById(id: string) {
    return prisma.request.findFirst({
      where: { id, deletedAt: null },
      select: {
        id:            true,
        status:        true,
        requestedById: true,
        venueBookings: {
          select: { venueId: true },
        },
      },
    });
  }
}