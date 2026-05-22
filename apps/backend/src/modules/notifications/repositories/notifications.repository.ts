// File: apps/backend/src/modules/notifications/repositories/notifications.repository.ts
// Purpose: All Prisma queries for notification records. Service never calls prisma directly.
// Dependencies: @repo/database, @nestjs/common

import { Injectable } from '@nestjs/common';
import { prisma, NotificationType } from '@repo/database';

@Injectable()
export class NotificationsRepository {

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findMany(params: {
    userId:      string;
    skip:        number;
    take:        number;
    unreadOnly?: boolean;
  }) {
    const { userId, skip, take, unreadOnly } = params;

    const where = {
      userId,
      ...(unreadOnly && { readAt: null }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return { data, total };
  }

  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async findById(id: string) {
    return prisma.notification.findUnique({ where: { id } });
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  async create(data: {
    userId:      string;
    type:        NotificationType;
    title:       string;
    body:        string;
    requestId?:  string;
    stepId?:     string;
    metadata?:   Record<string, any>;
  }) {
    return prisma.notification.create({
      data: {
        userId:    data.userId,
        type:      data.type,
        title:     data.title,
        body:      data.body,
        requestId: data.requestId ?? null,
        stepId:    data.stepId    ?? null,
        metadata:  data.metadata  ?? {},
      },
    });
  }

  async markOneRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data:  { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data:  { readAt: new Date() },
    });
  }
}