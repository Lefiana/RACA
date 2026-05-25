// File: apps/backend/src/modules/system-config/repositories/system-config.repository.ts
// Purpose: All Prisma queries for SystemConfig. Service never calls prisma directly.
// Dependencies: @repo/database, @nestjs/common

import { Injectable } from '@nestjs/common';
import { prisma, Prisma } from '@repo/database';

@Injectable()
export class SystemConfigRepository {

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findByKey(key: string) {
    return prisma.systemConfig.findUnique({ where: { key } });
  }

  async findMany(params: {
    skip:    number;
    take:    number;
    search?: string;
  }) {
    const { skip, take, search } = params;

    const where: Prisma.SystemConfigWhereInput = {
      ...(search && {
        OR: [
          { key:         { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.systemConfig.findMany({
        where,
        skip,
        take,
        orderBy: { key: 'asc' },
      }),
      prisma.systemConfig.count({ where }),
    ]);

    return { data, total };
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  // Upsert — creates if key doesn't exist, updates if it does.
  // Used by both POST and the seed file.
  async upsert(data: {
    key:          string;
    value:        string;
    description?: string;
    updatedBy?:   string;
  }) {
    return prisma.systemConfig.upsert({
      where:  { key: data.key },
      update: {
        value:       data.value,
        description: data.description,
        updatedBy:   data.updatedBy ?? null,
      },
      create: {
        key:         data.key,
        value:       data.value,
        description: data.description,
        updatedBy:   data.updatedBy ?? null,
      },
    });
  }

  async update(key: string, data: {
    value:        string;
    description?: string;
    updatedBy?:   string;
  }) {
    return prisma.systemConfig.update({
      where: { key },
      data: {
        value:       data.value,
        description: data.description,
        updatedBy:   data.updatedBy ?? null,
      },
    });
  }

  async delete(key: string) {
    return prisma.systemConfig.delete({ where: { key } });
  }
}