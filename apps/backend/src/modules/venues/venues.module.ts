// File: apps/backend/src/modules/venues/venues.module.ts
// Purpose: NestJS module for venue management.
// Dependencies: VenuesController, VenuesService, VenuesRepository

import { Module } from '@nestjs/common';
import { VenuesController } from './controllers/venues.controller';
import { VenuesService }    from './services/venues.service';
import { VenuesRepository } from './repositories/venues.repository';

@Module({
  controllers: [VenuesController],
  providers:   [VenuesService, VenuesRepository],
  exports:     [VenuesService],
})
export class VenuesModule {}
