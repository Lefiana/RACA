// File: apps/backend/src/modules/notifications/notifications.module.ts
// Purpose: NestJS module for in-app notifications and WebSocket delivery.
// Dependencies: NotificationsController, NotificationsService,
//               NotificationsRepository, NotificationsListener, NotificationsGateway

import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService }    from './services/notifications.service';
import { NotificationsRepository } from './repositories/notifications.repository';
import { NotificationsListener }   from './listeners/notifications.listener';
import { NotificationsGateway }    from './gateway/notifications.gateway';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationsListener,
    NotificationsGateway,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}