// File: apps/backend/src/modules/venues/repositories/venues.repository.ts
// CHANGED: inject PrismaService
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { Prisma, VenueStatus } from '@repo/database';

@Injectable()
export class VenuesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.venue.findFirst({ where: { id, deletedAt: null } });
  }

  async findByIdWithBookings(id: string) {
    return this.prisma.venue.findFirst({
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
                id:              true,
                referenceNumber: true,
                activityTitle:   true,
                status:          true,
                activityStartAt: true,
                activityEndAt:   true,
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

  async findMany(params: { skip: number; take: number; status?: VenueStatus; search?: string }) {
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

    const [data, total] = await this.prisma.$transaction([
      this.prisma.venue.findMany({ where, skip, take, orderBy: [{ building: 'asc' }, { name: 'asc' }] }),
      this.prisma.venue.count({ where }),
    ]);

    return { data, total };
  }

  async findAvailability(id: string, from: Date, to: Date) {
    return this.prisma.venueBooking.findMany({
      where: {
        venueId: id,
        OR: [{ isLocked: true }, { confirmedAt: { not: null } }],
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
    return this.prisma.venue.findFirst({ where: { name, deletedAt: null } });
  }

  async create(data: Prisma.VenueCreateInput) {
    return this.prisma.venue.create({ data });
  }

  async update(id: string, data: Prisma.VenueUpdateInput) {
    return this.prisma.venue.update({ where: { id }, data });
  }

  async setStatus(id: string, status: VenueStatus) {
    return this.prisma.venue.update({ where: { id }, data: { status } });
  }

  async softDelete(id: string) {
    return this.prisma.venue.update({
      where: { id },
      data:  { deletedAt: new Date(), status: VenueStatus.BLOCKED },
    });
  }

  async setMaintenance(id: string, data: {
    title:        string;
    description?: string;
    startAt:      Date;
    endAt?:       Date;
    loggedById?:  string;
  }) {
    return this.prisma.$transaction([
      this.prisma.venue.update({ where: { id }, data: { status: VenueStatus.MAINTENANCE } }),
      this.prisma.maintenanceLog.create({
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