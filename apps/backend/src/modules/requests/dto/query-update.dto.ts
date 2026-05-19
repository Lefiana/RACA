// File: apps/backend/src/modules/requests/dto/update-request.dto.ts
// Purpose: DTO for editing a DRAFT or PENDING request.
//          PartialType makes every field from CreateRequestDto optional —
//          only changed fields need to be sent.
//          The service enforces that editing is only allowed on DRAFT or PENDING status.
// Dependencies: @nestjs/swagger, create-request.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateRequestDto } from './create-request.dto';

// PartialType (from @nestjs/swagger, not @nestjs/mapped-types) preserves
// Swagger decorators on all inherited fields while making them optional.
export class UpdateRequestDto extends PartialType(CreateRequestDto) {}

// ─────────────────────────────────────────────────────────────────────────────

// File: apps/backend/src/modules/requests/dto/query-request.dto.ts
// Purpose: Query params DTO for the paginated GET /requests endpoint.
//          Supports filtering by status, date range, and text search.
//          All fields are optional — omitting them returns all visible requests.
// Dependencies: class-validator, class-transformer, @nestjs/swagger, @repo/database

import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RequestStatus } from '@repo/database';

export class QueryRequestDto {
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

  @ApiPropertyOptional({ enum: RequestStatus })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  // Filter by activity date range
  @ApiPropertyOptional({ example: '2025-06-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2025-06-30' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  // Full-text search across activityTitle and referenceNumber
  @ApiPropertyOptional({ example: 'prom' })
  @IsOptional()
  @IsString()
  search?: string;
}
