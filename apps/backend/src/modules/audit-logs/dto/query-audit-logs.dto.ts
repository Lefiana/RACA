// File: apps/backend/src/modules/audit-logs/dto/query-audit-logs.dto.ts
// Purpose: Query params for paginated, filterable audit log reads.
// Dependencies: class-validator, class-transformer, @nestjs/swagger

import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAuditLogsDto {
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

  @ApiPropertyOptional({ example: 'REQUEST_SUBMITTED' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: 'Request' })
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional({ example: 'clx1234abcd' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: 'clx5678efgh' })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiPropertyOptional({ example: '2025-06-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2025-06-30' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  // Searches across action and entity fields
  @ApiPropertyOptional({ example: 'REJECTED' })
  @IsOptional()
  @IsString()
  search?: string;
}