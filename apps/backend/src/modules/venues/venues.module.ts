// File: apps/backend/src/modules/venues/venues.module.ts
// CHANGED: added PrismaService
import { Module } from '@nestjs/common';
import { VenuesController } from './controllers/venues.controller';
import { VenuesService }    from './services/venues.service';
import { VenuesRepository } from './repositories/venues.repository';
import { PrismaService }    from '../../prisma.service';

@Module({
  controllers: [VenuesController],
  providers:   [VenuesService, VenuesRepository, PrismaService],
  exports:     [VenuesService],
})
export class VenuesModule {}