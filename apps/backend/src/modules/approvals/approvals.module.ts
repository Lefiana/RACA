// File: apps/backend/src/modules/approvals/approvals.module.ts
// CHANGED: added PrismaService
import { Module } from '@nestjs/common';
import { ApprovalsController } from './controllers/approvals.controller';
import { ApprovalsService }    from './services/approvals.service';
import { ApprovalsRepository } from './repositories/approvals.repository';
import { PrismaService }       from '../../prisma.service';

@Module({
  controllers: [ApprovalsController],
  providers:   [ApprovalsService, ApprovalsRepository, PrismaService],
  exports:     [ApprovalsService],
})
export class ApprovalsModule {}