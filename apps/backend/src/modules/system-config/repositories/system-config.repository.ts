// File: apps/backend/src/modules/system-config/repositories/system-config.repository.ts
// CHANGED: inject PrismaService
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { Prisma } from '@repo/database';

@Injectable()
export class SystemConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKey(key: string) {
    return this.prisma.systemConfig.findUnique({ where: { key } });
  }

  async findMany(params: { skip: number; take: number; search?: string }) {
    const { skip, take, search } = params;

    const where: Prisma.SystemConfigWhereInput = {
      ...(search && {
        OR: [
          { key:         { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.systemConfig.findMany({ where, skip, take, orderBy: { key: 'asc' } }),
      this.prisma.systemConfig.count({ where }),
    ]);

    return { data, total };
  }

  async upsert(data: { key: string; value: string; description?: string; updatedBy?: string }) {
    return this.prisma.systemConfig.upsert({
      where:  { key: data.key },
      update: { value: data.value, description: data.description, updatedBy: data.updatedBy ?? null },
      create: { key: data.key, value: data.value, description: data.description, updatedBy: data.updatedBy ?? null },
    });
  }

  async update(key: string, data: { value: string; description?: string; updatedBy?: string }) {
    return this.prisma.systemConfig.update({
      where: { key },
      data:  { value: data.value, description: data.description, updatedBy: data.updatedBy ?? null },
    });
  }

  async delete(key: string) {
    return this.prisma.systemConfig.delete({ where: { key } });
  }
}