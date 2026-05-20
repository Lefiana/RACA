// File: apps/backend/src/modules/venues/repositories/venues.repository.ts
// Purpose: All Prisma queries for venue CRUD, availability checking,
//          and booking history. Service never calls prisma directly.
// Dependencies: @repo/database, @nestjs/common

import { Injectable } from '@nestjs/common';
import { prisma, Prisma, VenueStatus } from '@repo/database';

@Injectable()
export class VenuesRepository {

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findById(id: string) {
    return prisma.venue.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdWithBookings(id: string) {
    return prisma.venue.findFirst({
      where:   { id, deletedAt: null },
      include: {
        bookings: {
          where: {
            OR: [
              { isLocked:    true },
              { confirmedAt: { not: null } },
            ],
          },
          include: {
            request: {
              select: {
                id:             true,
                referenceNumber: true,
                activityTitle:  true,
                status:         true,
                activityStartAt: true,
                activityEndAt:  true,
              },
            },
          },
          orderBy: { startAt: 'asc' },
        },
        maintenanceLogs: {
          where:   { resolvedAt: null },
          orderBy: { startAt: 'asc' },
        },
      },
    });
  }

  async findMany(params: {
    skip:     number;
    take:     number;
    status?:  VenueStatus;
    search?:  string;
  }) {
    const { skip, take, status, search } = params;

    const where: Prisma.VenueWhereInput = {
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name:        { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { building:    { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.venue.findMany({
        where,
        skip,
        take,
        orderBy: [{ building: 'asc' }, { name: 'asc' }],
      }),
      prisma.venue.count({ where }),
    ]);

    return { data, total };
  }

  // Returns all bookings in a date range for availability display.
  // Used by the calendar / availability endpoint.
  async findAvailability(id: string, from: Date, to: Date) {
    return prisma.venueBooking.findMany({
      where: {
        venueId: id,
        OR: [
          { isLocked:    true },
          { confirmedAt: { not: null } },
        ],
        // Overlap — any booking whose buffer window intersects the query range
        bufferStartAt: { lt: to   },
        bufferEndAt:   { gt: from },
      },
      include: {
        request: {
          select: {
            referenceNumber: true,
            activityTitle:   true,
            status:          true,
            activityStartAt: true,
            activityEndAt:   true,
          },
        },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async findByName(name: string) {
    return prisma.venue.findFirst({
      where: { name, deletedAt: null },
    });
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  async create(data: Prisma.VenueCreateInput) {
    return prisma.venue.create({ data });
  }

  async update(id: string, data: Prisma.VenueUpdateInput) {
    return prisma.venue.update({
      where: { id },
      data,
    });
  }

  async setStatus(id: string, status: VenueStatus) {
    return prisma.venue.update({
      where: { id },
      data:  { status },
    });
  }

  async softDelete(id: string) {
    return prisma.venue.update({
      where: { id },
      data:  { deletedAt: new Date(), status: VenueStatus.BLOCKED },
    });
  }

  // Creates a maintenance log entry alongside setting status to MAINTENANCE
  async setMaintenance(id: string, data: {
    title:       string;
    description?: string;
    startAt:     Date;
    endAt?:      Date;
    loggedById?: string;
  }) {
    return prisma.$transaction([
      prisma.venue.update({
        where: { id },
        data:  { status: VenueStatus.MAINTENANCE },
      }),
      prisma.maintenanceLog.create({
        data: {
          venueId:     id,
          title:       data.title,
          description: data.description,
          startAt:     data.startAt,
          endAt:       data.endAt,
          loggedById:  data.loggedById,
        },
      }),
    ]);
  }
}
