// File: apps/backend/src/modules/schedules/models/venue-event.model.ts
// Purpose: GraphQL ObjectType for a venue booking calendar event.
// Dependencies: @nestjs/graphql

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class VenueEventRequestedBy {
  @Field() name:       string;
  @Field({ nullable: true }) department: string | null;
}

@ObjectType()
export class VenueEvent {
  @Field() id:              string;
  @Field() venueId:         string;
  @Field() venueName:       string;
  @Field() requestId:       string;
  @Field() referenceNumber: string;
  @Field() activityTitle:   string;
  @Field() startAt:         string;
  @Field() endAt:           string;
  @Field() bufferStartAt:   string;
  @Field() bufferEndAt:     string;
  @Field() isLocked:        boolean;
  @Field() requestStatus:   string;
  @Field({ nullable: true }) confirmedAt:  string | null;
  @Field(() => VenueEventRequestedBy, { nullable: true })
  requestedBy: VenueEventRequestedBy | null;
}