// File: apps/backend/src/modules/notifications/notifications.module.ts
// CHANGED: added PrismaService
import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService }    from './services/notifications.service';
import { NotificationsRepository } from './repositories/notifications.repository';
import { NotificationsListener }   from './listeners/notifications.listener';
import { NotificationsGateway }    from './gateway/notifications.gateway';
import { PrismaService }           from '../../prisma.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationsListener,
    NotificationsGateway,
    PrismaService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}