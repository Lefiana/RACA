// File: apps/backend/src/modules/approvals/approvals.module.ts
// Purpose: NestJS module for the approval chain engine.
//          Does not import RequestsModule — it only needs the Prisma
//          instance from @repo/database directly via ApprovalsRepository.
// Dependencies: ApprovalsController, ApprovalsService, ApprovalsRepository

import { Module } from '@nestjs/common';
import { ApprovalsController } from './controllers/approvals.controller';
import { ApprovalsService }    from './services/approvals.service';
import { ApprovalsRepository } from './repositories/approvals.repository';

@Module({
  controllers: [ApprovalsController],
  providers:   [ApprovalsService, ApprovalsRepository],
  exports:     [ApprovalsService],
})
export class ApprovalsModule {}
