// File: apps/backend/src/modules/attachments/attachments.module.ts
// CHANGED: added PrismaService
import { Module } from '@nestjs/common';
import { AttachmentsController } from './controllers/attachments.controller';
import { AttachmentsService }    from './services/attachments.service';
import { AttachmentsRepository } from './repositories/attachments.repository';
import { StorageService }        from './services/storage.service';
import { PrismaService }         from '../../prisma.service';

@Module({
  controllers: [AttachmentsController],
  providers:   [AttachmentsService, AttachmentsRepository, StorageService, PrismaService],
  exports:     [AttachmentsService, StorageService],
})
export class AttachmentsModule {}