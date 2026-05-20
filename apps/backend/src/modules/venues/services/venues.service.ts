// File: apps/backend/src/modules/venues/services/venues.service.ts
// Purpose: Business logic for venue management.
//          Enforces role-based write access (BUILDING_ADMIN + SUPER_ADMIN only).
//          Availability queries include buffer time from SystemConfig.
// Dependencies: VenuesRepository, @nestjs/common, @repo/database

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, VenueStatus, prisma } from '@repo/database';

import { VenuesRepository }   from '../repositories/venues.repository';
import { CreateVenueDto }     from '../dto/create-venue.dto';
import { UpdateVenueDto }     from '../dto/update-venue.dto';
import { QueryVenueDto }      from '../dto/query-venue.dto';
import { SetVenueStatusDto }  from '../dto/set-venue-status.dto';

// Only these roles can write venue records
const VENUE_WRITE_ROLES = new Set<UserRole>([
  UserRole.BUILDING_ADMIN,
  UserRole.SUPER_ADMIN,
]);

@Injectable()
export class VenuesService {
  private readonly logger = new Logger(VenuesService.name);

  constructor(private readonly venuesRepo: VenuesRepository) {}

  // ── Create ────────────────────────────────────────────────────────────────

  async create(userRole: UserRole, dto: CreateVenueDto) {
    this.assertWriteAccess(userRole);

    const existing = await this.venuesRepo.findByName(dto.name);
    if (existing) {
      throw new BadRequestException(`A venue named "${dto.name}" already exists`);
    }

    const venue = await this.venuesRepo.create({
      name:        dto.name,
      description: dto.description,
      building:    dto.building,
      floor:       dto.floor,
      capacity:    dto.capacity,
      features:    dto.features ?? [],
      imageUrl:    dto.imageUrl,
      status:      VenueStatus.AVAILABLE,
    });

    this.logger.log(`[VenuesService] created venue: ${venue.name}`);
    return venue;
  }

  // ── Find many ─────────────────────────────────────────────────────────────

  async findMany(query: QueryVenueDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.venuesRepo.findMany({
      skip:   (page - 1) * limit,
      take:   limit,
      status: query.status,
      search: query.search,
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

  async findOne(id: string) {
    const venue = await this.venuesRepo.findByIdWithBookings(id);
    if (!venue) throw new NotFoundException('Venue not found');
    return venue;
  }

  // ── Availability for a date range ─────────────────────────────────────────

  async getAvailability(id: string, from: string, to: string) {
    const venue = await this.venuesRepo.findById(id);
    if (!venue) throw new NotFoundException('Venue not found');

    const fromDate = new Date(from);
    const toDate   = new Date(to);

    if (fromDate >= toDate) {
      throw new BadRequestException('from must be before to');
    }

    const bookings = await this.venuesRepo.findAvailability(id, fromDate, toDate);

    return {
      venue: { id: venue.id, name: venue.name, status: venue.status },
      bookings,
    };
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, userRole: UserRole, dto: UpdateVenueDto) {
    this.assertWriteAccess(userRole);

    const venue = await this.venuesRepo.findById(id);
    if (!venue) throw new NotFoundException('Venue not found');

    // Name uniqueness check on rename
    if (dto.name && dto.name !== venue.name) {
      const existing = await this.venuesRepo.findByName(dto.name);
      if (existing) {
        throw new BadRequestException(`A venue named "${dto.name}" already exists`);
      }
    }

    const updated = await this.venuesRepo.update(id, {
      ...(dto.name        !== undefined && { name:        dto.name        }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.building    !== undefined && { building:    dto.building    }),
      ...(dto.floor       !== undefined && { floor:       dto.floor       }),
      ...(dto.capacity    !== undefined && { capacity:    dto.capacity    }),
      ...(dto.features    !== undefined && { features:    dto.features    }),
      ...(dto.imageUrl    !== undefined && { imageUrl:    dto.imageUrl    }),
    });

    this.logger.log(`[VenuesService] updated venue: ${id}`);
    return updated;
  }

  // ── Set status ────────────────────────────────────────────────────────────

  async setStatus(id: string, userRole: UserRole, userId: string, dto: SetVenueStatusDto) {
    this.assertWriteAccess(userRole);

    const venue = await this.venuesRepo.findById(id);
    if (!venue) throw new NotFoundException('Venue not found');

    // Setting to MAINTENANCE also creates a MaintenanceLog entry
    if (dto.status === VenueStatus.MAINTENANCE) {
      await this.venuesRepo.setMaintenance(id, {
        title:       dto.reason ?? 'Scheduled maintenance',
        description: dto.reason,
        startAt:     new Date(),
        loggedById:  userId,
      });
    } else {
      await this.venuesRepo.setStatus(id, dto.status);
    }

    this.logger.log(`[VenuesService] venue ${id} status → ${dto.status}`);
    return this.venuesRepo.findById(id);
  }

  // ── Soft delete ───────────────────────────────────────────────────────────

  async remove(id: string, userRole: UserRole) {
    this.assertWriteAccess(userRole);

    const venue = await this.venuesRepo.findById(id);
    if (!venue) throw new NotFoundException('Venue not found');

    await this.venuesRepo.softDelete(id);
    this.logger.log(`[VenuesService] soft deleted venue: ${id}`);
  }

  // ── Guard ─────────────────────────────────────────────────────────────────

  private assertWriteAccess(userRole: UserRole) {
    if (!VENUE_WRITE_ROLES.has(userRole)) {
      throw new ForbiddenException(
        'Only Building Administrators and Super Admins can manage venues',
      );
    }
  }
}
