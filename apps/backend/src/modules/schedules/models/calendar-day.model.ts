// File: apps/backend/src/modules/schedules/models/calendar-day.model.ts
// Purpose: GraphQL ObjectType for a single day in the calendar summary (sparse).
// Dependencies: @nestjs/graphql

import { Field, Int, ObjectType } from '@nestjs/graphql';
import { VenueEvent }       from './venue-event.model';
import { AssetEvent }       from './asset-event.model';
import { MaintenanceEvent } from './maintenance-event.model';

@ObjectType()
export class CalendarDay {
  @Field() date: string; // ISO date string e.g. '2025-06-15'

  @Field(() => Int) venueEventCount:    number;
  @Field(() => Int) assetEventCount:    number;
  @Field(() => Int) maintenanceCount:   number;

  @Field(() => [VenueEvent])       venueEvents:        VenueEvent[];
  @Field(() => [AssetEvent])       assetEvents:        AssetEvent[];
  @Field(() => [MaintenanceEvent]) maintenanceEvents:  MaintenanceEvent[];
}