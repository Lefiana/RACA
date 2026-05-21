// File: apps/backend/src/modules/assets/dto/process-checkout.dto.ts
// Purpose: DTO for checkout and return processing — shared by both endpoints.
// Dependencies: class-validator, @nestjs/swagger, @repo/database

import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssetCondition } from '@repo/database';

export class ProcessCheckoutDto {
  @ApiPropertyOptional({ enum: AssetCondition, example: AssetCondition.GOOD })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @ApiPropertyOptional({ example: 'Minor scratch on the casing' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
