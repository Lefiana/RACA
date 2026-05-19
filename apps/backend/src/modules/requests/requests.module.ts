// File: apps/backend/src/modules/requests/requests.module.ts
// Purpose: NestJS module for the RACA request lifecycle.
//          Exports RequestsService so the Approvals module can call
//          findOne() when processing approval steps.
// Dependencies: RequestsController, RequestsService, RequestsRepository

import { Module } from '@nestjs/common';
import { RequestsController } from './controllers/requests.controller';
import { RequestsService }    from './services/requests.service';
import { RequestsRepository } from './repositories/requests.repository';

@Module({
  controllers: [RequestsController],
  providers:   [RequestsService, RequestsRepository],
  exports:     [RequestsService, RequestsRepository],
})
export class RequestsModule {}
