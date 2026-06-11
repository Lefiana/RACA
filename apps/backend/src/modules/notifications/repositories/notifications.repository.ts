// File: apps/backend/src/modules/notifications/repositories/notifications.repository.ts
// CHANGED: inject PrismaService
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { NotificationType } from '@repo/database';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: { userId: string; skip: number; take: number; unreadOnly?: boolean }) {
    const { userId, skip, take, unreadOnly } = params;
    const where = { userId, ...(unreadOnly && { isRead: false }) };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);

    return { data, total };
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async findById(id: string) {
    return this.prisma.notification.findUnique({ where: { id } });
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
    return this.prisma.notification.create({
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
    return this.prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    });
  }
}