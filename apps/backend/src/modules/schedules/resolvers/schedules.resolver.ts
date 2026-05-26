// File: apps/backend/src/modules/schedules/resolvers/schedules.resolver.ts
// Purpose: GraphQL query entry points. Delegates all logic to SchedulesService.
//          GqlAuthGuard validates the session before any resolver runs.
// Dependencies: @nestjs/graphql, @nestjs/common, SchedulesService, GqlAuthGuard

import { UseGuards }              from '@nestjs/common';
import { Args, Context, Query, Resolver } from '@nestjs/graphql';

import { SchedulesService }    from '../services/schedules.service';
import { ScheduleFilterInput } from '../dto/schedule-filter.input';
import { VenueEvent }          from '../models/venue-event.model';
import { AssetEvent }          from '../models/asset-event.model';
import { MaintenanceEvent }    from '../models/maintenance-event.model';
import { CalendarDay }         from '../models/calendar-day.model';
import { GqlAuthGuard }        from '../guards/gql-auth.guard';

@Resolver()
@UseGuards(GqlAuthGuard)
export class SchedulesResolver {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Query(() => [VenueEvent], { description: 'All locked/confirmed venue bookings in a date range' })
  async venueSchedule(
    @Args('filter') filter:  ScheduleFilterInput,
    @Context()      context: any,
  ): Promise<VenueEvent[]> {
    const user = context.req.user;
    return this.schedulesService.getVenueSchedule(filter, user.id, user.role);
  }

  @Query(() => [AssetEvent], { description: 'All asset checkouts in a date range' })
  async assetSchedule(
    @Args('filter') filter:  ScheduleFilterInput,
    @Context()      context: any,
  ): Promise<AssetEvent[]> {
    const user = context.req.user;
    return this.schedulesService.getAssetSchedule(filter, user.id, user.role);
  }

  @Query(() => [MaintenanceEvent], { description: 'All maintenance windows in a date range' })
  async maintenanceSchedule(
    @Args('filter') filter:  ScheduleFilterInput,
    @Context()      context: any,
  ): Promise<MaintenanceEvent[]> {
    const user = context.req.user;
    return this.schedulesService.getMaintenanceSchedule(filter, user.id, user.role);
  }

  @Query(() => [CalendarDay], { description: 'Sparse day-by-day calendar summary' })
  async calendarSummary(
    @Args('filter') filter:  ScheduleFilterInput,
    @Context()      context: any,
  ): Promise<CalendarDay[]> {
    const user = context.req.user;
    return this.schedulesService.getCalendarSummary(filter, user.id, user.role);
  }
}