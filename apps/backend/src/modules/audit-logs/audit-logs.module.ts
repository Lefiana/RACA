// File: apps/backend/src/modules/audit-logs/audit-logs.module.ts
// Purpose: NestJS module for the append-only audit trail.
// Dependencies: AuditLogsController, AuditLogsService,
//               AuditLogsRepository, AuditLogsListener

import { Module } from '@nestjs/common';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { AuditLogsService }    from './services/audit-logs.service';
import { AuditLogsRepository } from './repositories/audit-logs.repository';
import { AuditLogsListener }   from './listeners/audit-logs.listener';

@Module({
  controllers: [AuditLogsController],
  providers:   [AuditLogsService, AuditLogsRepository, AuditLogsListener],
  exports:     [AuditLogsService],
})
export class AuditLogsModule {}