// File: apps/backend/src/modules/venues/dto/set-venue-status.dto.ts
// Purpose: DTO for PATCH /venues/:id/status — sets AVAILABLE/MAINTENANCE/BLOCKED.
// Dependencies: class-validator, @nestjs/swagger, @repo/database

import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VenueStatus } from '@repo/database';

export class SetVenueStatusDto {
  @ApiProperty({ enum: VenueStatus, example: VenueStatus.MAINTENANCE })
  @IsEnum(VenueStatus)
  @IsNotEmpty()
  status: VenueStatus;

  @ApiPropertyOptional({ example: 'Scheduled for electrical maintenance' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
