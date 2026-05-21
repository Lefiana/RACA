// File: apps/backend/src/modules/attachments/attachments.module.ts
// Purpose: NestJS module for file attachment management.
//          Exports AttachmentsService so the Requests module can
//          reference attachment counts if needed in the future.
// Dependencies: AttachmentsController, AttachmentsService,
//               AttachmentsRepository, StorageService

import { Module } from '@nestjs/common';
import { AttachmentsController } from './controllers/attachments.controller';
import { AttachmentsService }    from './services/attachments.service';
import { AttachmentsRepository } from './repositories/attachments.repository';
import { StorageService }        from './services/storage.service';

@Module({
  controllers: [AttachmentsController],
  providers:   [AttachmentsService, AttachmentsRepository, StorageService],
  exports:     [AttachmentsService, StorageService],
})
export class AttachmentsModule {}
