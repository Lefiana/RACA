// File: apps/backend/src/modules/assets/dto/set-asset-status.dto.ts
// Purpose: DTO for PATCH /assets/:id/status.
// Dependencies: class-validator, @nestjs/swagger, @repo/database

import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetStatus } from '@repo/database';

export class SetAssetStatusDto {
  @ApiProperty({ enum: AssetStatus })
  @IsEnum(AssetStatus)
  @IsNotEmpty()
  status: AssetStatus;

  @ApiPropertyOptional({ example: 'Broken lens — sent for repair' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
