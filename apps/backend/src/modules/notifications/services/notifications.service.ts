// File: apps/backend/src/modules/notifications/services/notifications.service.ts
// Purpose: Creates notifications, marks them read, and pushes via gateway.
//          All create calls go through here — never directly to the repository.
// Dependencies: NotificationsRepository, NotificationsGateway, @repo/database

import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@repo/database';

import { NotificationsRepository } from '../repositories/notifications.repository';
import { NotificationsGateway }    from '../gateway/notifications.gateway';
import { QueryNotificationsDto }   from '../dto/query-notifications.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepo: NotificationsRepository,
    private readonly gateway:           NotificationsGateway,
  ) {}

  // ── Create + push ─────────────────────────────────────────────────────────

  // Central method used by the listener for all notification creation.
  // Writes to DB first, then pushes via WebSocket.
  async createAndPush(data: {
    userId:     string;
    type:       NotificationType;
    title:      string;
    body:       string;
    requestId?: string;
    stepId?:    string;
    metadata?:  Record<string, any>;
  }) {
    const notification = await this.notificationsRepo.create(data);

    // Push real-time update to the user's WebSocket room
    this.gateway.sendToUser(data.userId, 'notification.new', { notification });

    this.logger.log(
      `[NotificationsService] created+pushed: type=${data.type} userId=${data.userId}`,
    );

    return notification;
  }

  // ── REST reads ────────────────────────────────────────────────────────────

  async findMany(userId: string, query: QueryNotificationsDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.notificationsRepo.findMany({
      userId,
      skip:       (page - 1) * limit,
      take:       limit,
      unreadOnly: query.unreadOnly,
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

  async countUnread(userId: string) {
    const count = await this.notificationsRepo.countUnread(userId);
    return { count };
  }

  // ── Mark read ─────────────────────────────────────────────────────────────

  async markOneRead(id: string, userId: string) {
    const notification = await this.notificationsRepo.findById(id);
    if (!notification) throw new NotFoundException('Notification not found');

    // Users can only mark their own notifications as read
    if (notification.userId !== userId) {
      throw new ForbiddenException('You can only mark your own notifications as read');
    }

    return this.notificationsRepo.markOneRead(id);
  }

  async markAllRead(userId: string) {
    await this.notificationsRepo.markAllRead(userId);
    return { success: true };
  }
}