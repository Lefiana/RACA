// File: apps/backend/src/modules/schedules/models/asset-event.model.ts
// Purpose: GraphQL ObjectType for an asset checkout calendar event.
// Dependencies: @nestjs/graphql

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AssetEvent {
  @Field() id:             string;
  @Field() assetId:        string;
  @Field() assetTag:       string;
  @Field() assetName:      string;
  @Field() category:       string;
  @Field() requestId:      string;
  @Field() referenceNumber: string;
  @Field() activityTitle:  string;
  @Field() status:         string;
  @Field(() => Int) quantity: number;
  @Field({ nullable: true }) checkedOutAt: string | null;
  @Field({ nullable: true }) dueAt:        string | null;
  @Field({ nullable: true }) returnedAt:   string | null;
}