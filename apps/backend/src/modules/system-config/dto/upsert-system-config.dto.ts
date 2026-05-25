// File: apps/backend/src/modules/system-config/dto/upsert-system-config.dto.ts
// Purpose: DTO for POST (create/upsert) and PATCH (update) system config entries.
// Dependencies: class-validator, @nestjs/swagger

import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertSystemConfigDto {
  @ApiProperty({ example: 'reservation_buffer_min' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key: string;

  @ApiProperty({ example: '30' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  value: string;

  @ApiPropertyOptional({ example: 'Buffer time in minutes added before and after a venue booking' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}