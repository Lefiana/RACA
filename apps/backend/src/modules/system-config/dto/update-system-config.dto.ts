// File: apps/backend/src/modules/system-config/dto/update-system-config.dto.ts
// Purpose: DTO for PATCH — key comes from the URL param, only value and description are in the body.
// Dependencies: class-validator, @nestjs/swagger

import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSystemConfigDto {
  @ApiProperty({ example: '45' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  value: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}