// File: apps/backend/src/modules/schedules/schedules.module.ts
// CHANGED: added PrismaService
import { Module }            from '@nestjs/common';
import { SchedulesResolver } from './resolvers/schedules.resolver';
import { SchedulesService }  from './services/schedules.service';
import { GqlAuthGuard }      from './guards/gql-auth.guard';
import { PrismaService }     from '../../prisma.service';

@Module({
  providers: [SchedulesResolver, SchedulesService, GqlAuthGuard, PrismaService],
  exports:   [SchedulesService],
})
export class SchedulesModule {}