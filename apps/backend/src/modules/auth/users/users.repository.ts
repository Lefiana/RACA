// File: apps/backend/src/modules/auth/users/users.repository.ts
// CHANGED: inject PrismaService
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { Prisma, UserRole, ApprovalGroup } from '@repo/database';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  async findMany(params: { skip?: number; take?: number; role?: UserRole; search?: string }) {
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

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, username: true,
          role: true, department: true, isActive: true,
          approvalGroup: true,
          lastLoginAt: true, createdAt: true, updatedAt: true, image: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  // ── NEW: Check if another active Department Head already holds this approvalGroup ─
  async hasActiveDepartmentHeadForGroup(
    approvalGroup: ApprovalGroup,
    excludeUserId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        role:           UserRole.DEPARTMENT_HEAD,
        approvalGroup:  approvalGroup,
        isActive:       true,
        deletedAt:      null,
        ...(excludeUserId && { id: { not: excludeUserId } }),
      },
    });
    return count > 0;
  }

  // CHANGED: Now accepts optional approvalGroup
  async updateRole(id: string, role: UserRole, approvalGroup?: ApprovalGroup) {
    return this.prisma.user.update({
      where: { id },
      data:  {
        role,
        ...(approvalGroup !== undefined && { approvalGroup }),
      },
      select: {
        id: true, name: true, email: true, username: true,
        role: true, approvalGroup: true, department: true,
        isActive: true, updatedAt: true,
      },
    });
  }

  async updateActiveStatus(id: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id },
      data:  { isActive },
      select: { id: true, name: true, email: true, username: true, role: true, isActive: true, updatedAt: true },
    });
  }

  async updateLastLogin(id: string) {
    return this.prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  async softDelete(id: string) {
    return this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}