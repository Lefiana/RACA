// File: apps/backend/src/modules/notifications/controllers/notifications.controller.ts
// Purpose: REST endpoints for the notification inbox.
// Dependencies: @nestjs/common, @thallesp/nestjs-better-auth, NotificationsService

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';

import { NotificationsService }  from '../services/notifications.service';
import { QueryNotificationsDto } from '../dto/query-notifications.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // GET /api/v1/notifications
  @Get()
  @ApiOperation({ summary: 'Get paginated notification inbox for the current user' })
  async findAll(
    @Session() session: UserSession,
    @Query()   query:   QueryNotificationsDto,
  ) {
    return this.notificationsService.findMany(session.user.id, query);
  }

  // GET /api/v1/notifications/unread-count
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for badge display' })
  async unreadCount(@Session() session: UserSession) {
    return this.notificationsService.countUnread(session.user.id);
  }

  // PATCH /api/v1/notifications/:id/read
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markOneRead(
    @Session()    session: UserSession,
    @Param('id')  id:      string,
  ) {
    return this.notificationsService.markOneRead(id, session.user.id);
  }

  // PATCH /api/v1/notifications/read-all
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@Session() session: UserSession) {
    return this.notificationsService.markAllRead(session.user.id);
  }
}