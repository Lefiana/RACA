// File: apps/backend/src/modules/system-config/dto/query-system-config.dto.ts
// Purpose: Query params for paginated system config list.
// Dependencies: class-validator, class-transformer, @nestjs/swagger

import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QuerySystemConfigDto {
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

  @ApiPropertyOptional({ example: 'buffer' })
  @IsOptional()
  @IsString()
  search?: string;
}