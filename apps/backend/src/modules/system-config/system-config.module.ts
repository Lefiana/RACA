// File: apps/backend/src/modules/system-config/system-config.module.ts
// CHANGED: added PrismaService
import { Module } from '@nestjs/common';
import { SystemConfigController } from './controllers/system-config.controller';
import { SystemConfigService }    from './services/system-config.service';
import { SystemConfigRepository } from './repositories/system-config.repository';
import { PrismaService }          from '../../prisma.service';

@Module({
  controllers: [SystemConfigController],
  providers:   [SystemConfigService, SystemConfigRepository, PrismaService],
  exports:     [SystemConfigService],
})
export class SystemConfigModule {}