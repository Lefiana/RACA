// File: apps/backend/src/modules/schedules/schedules.module.ts
// Purpose: NestJS module for GraphQL calendar queries.
// Dependencies: SchedulesResolver, SchedulesService, GqlAuthGuard

import { Module }         from '@nestjs/common';
import { SchedulesResolver } from './resolvers/schedules.resolver';
import { SchedulesService }  from './services/schedules.service';
import { GqlAuthGuard }      from './guards/gql-auth.guard';

@Module({
  providers: [SchedulesResolver, SchedulesService, GqlAuthGuard],
  exports:   [SchedulesService],
})
export class SchedulesModule {}