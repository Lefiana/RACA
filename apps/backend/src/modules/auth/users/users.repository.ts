// File: apps/api/src/modules/auth/users/users.repository.ts
// Purpose: All Prisma queries for app-specific user operations.
//          Better Auth handles its own queries internally.
//          This repository only touches fields our app owns:
//          role, isActive, department, lastLoginAt, deletedAt.
// Dependencies: @raca/database (prisma instance + types)

import { Injectable } from '@nestjs/common';
import { Prisma, UserRole, prisma } from '@repo/database';

@Injectable()
export class UsersRepository {
  // ── Reads ─────────────────────────────────────────────────────────────────

  async findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async findMany(params: {
    skip?:   number;
    take?:   number;
    role?:   UserRole;
    search?: string;
  }) {
    const { skip = 0, take = 20, role, search } = params;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role   && { role }),
      ...(search && {
        OR: [
          { name:     { contains: search, mode: 'insensitive' } },
          { email:    { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        // Never return password-related fields to the service layer.
        // Better Auth stores passwords in the Account table, not here,
        // but we select explicitly as a safety habit.
        select: {
          id:          true,
          name:        true,
          email:       true,
          username:    true,
          role:        true,
          department:  true,
          isActive:    true,
          lastLoginAt: true,
          createdAt:   true,
          updatedAt:   true,
          image:       true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  async updateRole(id: string, role: UserRole) {
    return prisma.user.update({
      where: { id },
      data:  { role },
      select: {
        id: true, name: true, email: true,
        username: true, role: true, department: true,
        isActive: true, updatedAt: true,
      },
    });
  }

  async updateActiveStatus(id: string, isActive: boolean) {
    return prisma.user.update({
      where: { id },
      data:  { isActive },
      select: {
        id: true, name: true, email: true,
        username: true, role: true, isActive: true, updatedAt: true,
      },
    });
  }

  async updateLastLogin(id: string) {
    // Fire-and-forget friendly — callers should not await this.
    return prisma.user.update({
      where: { id },
      data:  { lastLoginAt: new Date() },
    });
  }

  // Soft delete — audit logs reference userId so hard deletes break history
  async softDelete(id: string) {
    return prisma.user.update({
      where: { id },
      data:  { deletedAt: new Date() },
    });
  }
}
