// File: apps/backend/src/modules/requests/requests.module.ts
// CHANGED: added PrismaService to providers
import { Module } from '@nestjs/common';
import { RequestsController } from './controllers/requests.controller';
import { RequestsService }    from './services/requests.service';
import { RequestsRepository } from './repositories/requests.repository';
import { PrismaService }      from '../../prisma.service';

@Module({
  controllers: [RequestsController],
  providers:   [RequestsService, RequestsRepository, PrismaService],
  exports:     [RequestsService, RequestsRepository],
})
export class RequestsModule {}