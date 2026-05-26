// File: apps/backend/src/modules/schedules/dto/schedule-filter.input.ts
// Purpose: GraphQL InputType for all schedule queries — date range + optional filters.
// Dependencies: @nestjs/graphql, class-validator

import { Field, InputType } from '@nestjs/graphql';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class ScheduleFilterInput {
  @Field()
  @IsDateString()
  @IsNotEmpty()
  from: string;

  @Field()
  @IsDateString()
  @IsNotEmpty()
  to: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  venueId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  assetId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  requestId?: string;
}