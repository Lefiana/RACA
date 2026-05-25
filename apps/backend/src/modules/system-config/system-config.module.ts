// File: apps/backend/src/modules/system-config/system-config.module.ts
// Purpose: NestJS module for system configuration management.
// Dependencies: SystemConfigController, SystemConfigService, SystemConfigRepository

import { Module } from '@nestjs/common';
import { SystemConfigController } from './controllers/system-config.controller';
import { SystemConfigService }    from './services/system-config.service';
import { SystemConfigRepository } from './repositories/system-config.repository';

@Module({
  controllers: [SystemConfigController],
  providers:   [SystemConfigService, SystemConfigRepository],
  exports:     [SystemConfigService],
})
export class SystemConfigModule {}