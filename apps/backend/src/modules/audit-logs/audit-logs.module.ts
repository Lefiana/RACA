// File: apps/backend/src/modules/audit-logs/audit-logs.module.ts
// CHANGED: added PrismaService
import { Module } from '@nestjs/common';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { AuditLogsService }    from './services/audit-logs.service';
import { AuditLogsRepository } from './repositories/audit-logs.repository';
import { AuditLogsListener }   from './listeners/audit-logs.listener';
import { PrismaService }       from '../../prisma.service';

@Module({
  controllers: [AuditLogsController],
  providers:   [AuditLogsService, AuditLogsRepository, AuditLogsListener, PrismaService],
  exports:     [AuditLogsService],
})
export class AuditLogsModule {}