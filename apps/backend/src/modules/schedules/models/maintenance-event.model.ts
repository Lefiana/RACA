// File: apps/backend/src/modules/schedules/models/maintenance-event.model.ts
// Purpose: GraphQL ObjectType for a maintenance window (venue or asset).
// Dependencies: @nestjs/graphql

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MaintenanceEvent {
  @Field() id:          string;
  @Field() entityType:  string; // 'VENUE' | 'ASSET'
  @Field() entityId:    string;
  @Field() entityName:  string;
  @Field() title:       string;
  @Field() startAt:     string;
  @Field({ nullable: true }) description: string | null;
  @Field({ nullable: true }) endAt:       string | null;
  @Field({ nullable: true }) resolvedAt:  string | null;
}