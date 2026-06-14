// File: apps/backend/src/modules/auth/users/users.service.ts
// Purpose: Business logic for app-specific user management.
//          Better Auth owns signup/login/session — this service owns
//          everything after: role assignment, listing, deactivation, soft delete.
// Dependencies: UsersRepository, @nestjs/common, @raca/database

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, ApprovalGroup } from '@repo/database';
import { UsersRepository } from './users.repository';

// IPaginationMeta — shared pagination shape used by every list endpoint
export interface IPaginationMeta {
  total:       number;
  page:        number;
  limit:       number;
  totalPages:  number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepo: UsersRepository) {}

  async findById(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findMany(params: {
    page?:   number;
    limit?:  number;
    role?:   UserRole;
    search?: string;
  }): Promise<{ data: any[]; meta: IPaginationMeta }> {
    const page  = Math.max(1, params.page  ?? 1);
    const limit = Math.min(100, params.limit ?? 20);

    const { data, total } = await this.usersRepo.findMany({
      skip:   (page - 1) * limit,
      take:   limit,
      role:   params.role,
      search: params.search,
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

  // CHANGED: Now accepts optional approvalGroup and validates uniqueness
  // for DEPARTMENT_HEAD assignments.
  async updateRole(id: string, role: UserRole, approvalGroup?: ApprovalGroup) {
    // Verify user exists first
    const user = await this.usersRepo.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);

    // ── NEW: Validate approvalGroup for DEPARTMENT_HEAD ─────────────────────
    if (role === UserRole.DEPARTMENT_HEAD) {
      if (!approvalGroup) {
        throw new BadRequestException(
          'approvalGroup is required when assigning the DEPARTMENT_HEAD role.',
        );
      }

      const hasConflict = await this.usersRepo.hasActiveDepartmentHeadForGroup(
        approvalGroup,
        id, // exclude the current user being updated
      );

      if (hasConflict) {
        throw new BadRequestException(
          `Another active Department Head is already assigned to the ${approvalGroup} approval group.`,
        );
      }
    }

    // If role is NOT DEPARTMENT_HEAD but approvalGroup was passed, clear it
    const effectiveApprovalGroup = role === UserRole.DEPARTMENT_HEAD
      ? approvalGroup
      : null;

    const updated = await this.usersRepo.updateRole(
      id,
      role,
      effectiveApprovalGroup ?? undefined,
    );

    this.logger.log(
      `[UsersService] user ${id} role updated → ${role}` +
      (effectiveApprovalGroup ? ` (group: ${effectiveApprovalGroup})` : ''),
    );
    return updated;
  }

  async toggleActive(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);

    const updated = await this.usersRepo.updateActiveStatus(id, !user.isActive);
    this.logger.log(`[UsersService] user ${id} isActive → ${updated.isActive}`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const user = await this.usersRepo.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);

    await this.usersRepo.softDelete(id);
    this.logger.log(`[UsersService] soft deleted user ${id}`);
  }
}