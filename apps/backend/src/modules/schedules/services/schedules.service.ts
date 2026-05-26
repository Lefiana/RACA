// File: apps/backend/src/modules/schedules/services/schedules.service.ts
// Purpose: Data fetching and shaping for all calendar queries.
//          Enforces role-based scoping and the 90-day range limit.
//          No writes — read-only across VenueBooking, AssetCheckout, MaintenanceLog.
// Dependencies: @repo/database, @nestjs/common

import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { prisma, UserRole } from '@repo/database';

import { ScheduleFilterInput } from '../dto/schedule-filter.input';
import { VenueEvent }          from '../models/venue-event.model';
import { AssetEvent }          from '../models/asset-event.model';
import { MaintenanceEvent }    from '../models/maintenance-event.model';
import { CalendarDay }         from '../models/calendar-day.model';

// Roles that see all events with no scoping
const FULL_VIEW_ROLES = new Set<string>([
  UserRole.SUPER_ADMIN,
  UserRole.SCHOOL_ADMIN,
  UserRole.ADVISER,
  UserRole.DEPARTMENT_HEAD,
  UserRole.MIS,
  UserRole.BUILDING_ADMIN,
  UserRole.STUDENT_AFFAIRS,
  UserRole.ACADEMIC_HEAD,
]);

const MAX_RANGE_DAYS = 90;

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  // ── Venue schedule ────────────────────────────────────────────────────────

  async getVenueSchedule(
    filter:   ScheduleFilterInput,
    userId:   string,
    userRole: string,
  ): Promise<VenueEvent[]> {
    const { from, to } = this.validateRange(filter.from, filter.to);

    const bookings = await prisma.venueBooking.findMany({
      where: {
        // Only show locked or confirmed bookings — drafts are invisible on the calendar
        OR: [
          { isLocked:    true },
          { confirmedAt: { not: null } },
        ],
        bufferStartAt: { lt: to   },
        bufferEndAt:   { gt: from },
        ...(filter.venueId   && { venueId:   filter.venueId   }),
        ...(filter.requestId && { requestId: filter.requestId }),
        // REQUESTOR scope — only their own requests
        ...(!FULL_VIEW_ROLES.has(userRole) && userRole !== UserRole.HRM_CUSTODIAN && {
          request: { requestedById: userId },
        }),
      },
      include: {
        venue: {
          select: { id: true, name: true },
        },
        request: {
          select: {
            id:              true,
            referenceNumber: true,
            activityTitle:   true,
            status:          true,
            requestedBy: {
              select: { name: true, department: true },
            },
          },
        },
      },
      orderBy: { startAt: 'asc' },
    });

    return bookings.map(b => ({
      id:              b.id,
      venueId:         b.venueId,
      venueName:       b.venue.name,
      requestId:       b.requestId,
      referenceNumber: b.request.referenceNumber,
      activityTitle:   b.request.activityTitle,
      startAt:         b.startAt.toISOString(),
      endAt:           b.endAt.toISOString(),
      bufferStartAt:   b.bufferStartAt.toISOString(),
      bufferEndAt:     b.bufferEndAt.toISOString(),
      isLocked:        b.isLocked,
      confirmedAt:     b.confirmedAt?.toISOString() ?? null,
      requestStatus:   b.request.status,
      requestedBy:     b.request.requestedBy
        ? { name: b.request.requestedBy.name, department: b.request.requestedBy.department ?? null }
        : null,
    }));
  }

  // ── Asset schedule ────────────────────────────────────────────────────────

  async getAssetSchedule(
    filter:   ScheduleFilterInput,
    userId:   string,
    userRole: string,
  ): Promise<AssetEvent[]> {
    const { from, to } = this.validateRange(filter.from, filter.to);

    const checkouts = await prisma.assetCheckout.findMany({
      where: {
        // Show checkouts whose activity window overlaps the query range
        request: {
          activityStartAt: { lt: to   },
          activityEndAt:   { gt: from },
          // REQUESTOR scope
          ...(!FULL_VIEW_ROLES.has(userRole) && userRole !== UserRole.HRM_CUSTODIAN && {
            requestedById: userId,
          }),
        },
        ...(filter.assetId   && { assetId:   filter.assetId   }),
        ...(filter.requestId && { requestId: filter.requestId }),
        // HRM_CUSTODIAN sees only their own asset category
        ...(userRole === UserRole.HRM_CUSTODIAN && {
          asset: { custodianRole: 'HRM_CUSTODIAN' },
        }),
      },
      include: {
        asset: {
          select: {
            id:       true,
            assetTag: true,
            name:     true,
            category: true,
          },
        },
        request: {
          select: {
            id:              true,
            referenceNumber: true,
            activityTitle:   true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return checkouts.map(c => ({
      id:              c.id,
      assetId:         c.assetId,
      assetTag:        c.asset.assetTag,
      assetName:       c.asset.name,
      category:        c.asset.category,
      requestId:       c.requestId,
      referenceNumber: c.request.referenceNumber,
      activityTitle:   c.request.activityTitle,
      status:          c.status,
      quantity:        c.quantity,
      checkedOutAt:    c.checkedOutAt?.toISOString() ?? null,
      dueAt:           c.dueAt?.toISOString()        ?? null,
      returnedAt:      c.returnedAt?.toISOString()   ?? null,
    }));
  }

  // ── Maintenance schedule ──────────────────────────────────────────────────

  async getMaintenanceSchedule(
    filter:   ScheduleFilterInput,
    userId:   string,
    userRole: string,
  ): Promise<MaintenanceEvent[]> {
    const { from, to } = this.validateRange(filter.from, filter.to);

    const logs = await prisma.maintenanceLog.findMany({
      where: {
        startAt: { lt: to   },
        OR: [
          { endAt: null        },       // ongoing — no end date set yet
          { endAt: { gt: from } },
        ],
      },
      include: {
        venue: { select: { id: true, name: true } },
        asset: { select: { id: true, name: true } },
      },
      orderBy: { startAt: 'asc' },
    });

    return logs.map(log => ({
      id:          log.id,
      entityType:  log.venueId ? 'VENUE' : 'ASSET',
      entityId:    (log.venueId ?? log.assetId)!,
      entityName:  log.venue?.name ?? log.asset?.name ?? 'Unknown',
      title:       log.title,
      description: log.description ?? null,
      startAt:     log.startAt.toISOString(),
      endAt:       log.endAt?.toISOString()      ?? null,
      resolvedAt:  log.resolvedAt?.toISOString() ?? null,
    }));
  }

  // ── Calendar summary (sparse) ─────────────────────────────────────────────

  async getCalendarSummary(
    filter:   ScheduleFilterInput,
    userId:   string,
    userRole: string,
  ): Promise<CalendarDay[]> {
    // Fetch all three event types in parallel
    const [venueEvents, assetEvents, maintenanceEvents] = await Promise.all([
      this.getVenueSchedule(filter, userId, userRole),
      this.getAssetSchedule(filter, userId, userRole),
      this.getMaintenanceSchedule(filter, userId, userRole),
    ]);

    // Group events by their date (YYYY-MM-DD)
    const dayMap = new Map<string, CalendarDay>();

    const getOrCreate = (date: string): CalendarDay => {
      if (!dayMap.has(date)) {
        dayMap.set(date, {
          date,
          venueEventCount:   0,
          assetEventCount:   0,
          maintenanceCount:  0,
          venueEvents:       [],
          assetEvents:       [],
          maintenanceEvents: [],
        });
      }
      return dayMap.get(date)!;
    };

    for (const event of venueEvents) {
      const date = event.startAt.slice(0, 10);
      const day  = getOrCreate(date);
      day.venueEvents.push(event);
      day.venueEventCount++;
    }

    for (const event of assetEvents) {
      // Asset checkouts use the request's activity date — derive from checkedOutAt or dueAt
      const date = (event.checkedOutAt ?? event.dueAt ?? new Date().toISOString()).slice(0, 10);
      const day  = getOrCreate(date);
      day.assetEvents.push(event);
      day.assetEventCount++;
    }

    for (const event of maintenanceEvents) {
      const date = event.startAt.slice(0, 10);
      const day  = getOrCreate(date);
      day.maintenanceEvents.push(event);
      day.maintenanceCount++;
    }

    // Return sorted by date — sparse, only days with at least one event
    return Array.from(dayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private validateRange(from: string, to: string): { from: Date; to: Date } {
    const fromDate = new Date(from);
    const toDate   = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date format in filter');
    }

    if (fromDate >= toDate) {
      throw new BadRequestException('"from" must be before "to"');
    }

    const diffDays =
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Date range cannot exceed ${MAX_RANGE_DAYS} days. Requested: ${Math.ceil(diffDays)} days.`,
      );
    }

    return { from: fromDate, to: toDate };
  }
}