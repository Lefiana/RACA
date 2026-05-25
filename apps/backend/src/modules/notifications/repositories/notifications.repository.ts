// File: apps/backend/src/modules/notifications/repositories/notifications.repository.ts
// Purpose: All Prisma queries for notification records.
// Dependencies: @repo/database, @nestjs/common

import { Injectable } from '@nestjs/common';
import { prisma, NotificationType } from '@repo/database';

@Injectable()
export class NotificationsRepository {

  async findMany(params: {
    userId:      string;
    skip:        number;
    take:        number;
    unreadOnly?: boolean;
  }) {
    const { userId, skip, take, unreadOnly } = params;

    const where = {
      userId,
      // CHANGED: isRead is the indexed boolean field — use it, not readAt
      ...(unreadOnly && { isRead: false }),
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
    // CHANGED: isRead: false — matches the @@index([userId, isRead]) for performance
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async findById(id: string) {
    return prisma.notification.findUnique({ where: { id } });
  }

  async create(data: {
    userId:     string;
    type:       NotificationType;
    title:      string;
    body:       string;
    requestId?: string;
    stepId?:    string;
    metadata?:  Record<string, any>;
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
    // CHANGED: set both isRead and readAt together
    return prisma.notification.update({
      where: { id },
      data:  { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    // CHANGED: set both isRead and readAt together
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    });
  }
}