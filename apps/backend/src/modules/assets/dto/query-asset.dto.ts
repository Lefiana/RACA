// File: apps/backend/src/modules/assets/dto/query-asset.dto.ts
// Purpose: Query params for GET /assets — pagination, filters, custodian scope.
// Dependencies: class-validator, class-transformer, @nestjs/swagger, @repo/database

import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssetStatus, AssetCustodian } from '@repo/database';

export class QueryAssetDto {
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

  @ApiPropertyOptional({ enum: AssetStatus })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({ example: 'Projector' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'CUB-PRJ' })
  @IsOptional()
  @IsString()
  search?: string;

  // SUPER_ADMIN can filter by custodian. Other roles are auto-scoped.
  @ApiPropertyOptional({ enum: AssetCustodian })
  @IsOptional()
  @IsEnum(AssetCustodian)
  custodianRole?: AssetCustodian;
}
