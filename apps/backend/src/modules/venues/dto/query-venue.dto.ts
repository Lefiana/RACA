// File: apps/backend/src/modules/venues/dto/query-venue.dto.ts
// Purpose: Query params for GET /venues — pagination, status filter, search.
// Dependencies: class-validator, class-transformer, @nestjs/swagger, @repo/database

import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VenueStatus } from '@repo/database';

export class QueryVenueDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: VenueStatus })
  @IsOptional()
  @IsEnum(VenueStatus)
  status?: VenueStatus;

  @ApiPropertyOptional({ example: 'AVR' })
  @IsOptional()
  @IsString()
  search?: string;
}
