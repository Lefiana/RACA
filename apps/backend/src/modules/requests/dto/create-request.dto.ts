// File: apps/backend/src/modules/requests/dto/create-request.dto.ts
// Purpose: Validated DTO for creating a new RACA request (saved as DRAFT).
//          Mirrors the RACA paper form sections I–VI plus venue/asset selections.
//          class-validator runs before the request reaches the service layer.
// Dependencies: class-validator, class-transformer, @nestjs/swagger

import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalGroup } from '@repo/database';

// ── Nested DTO: Speaker entry ─────────────────────────────────────────────────

export class SpeakerDto {
  @ApiProperty({ example: 'Juan dela Cruz' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Guest Speaker' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @ApiPropertyOptional({ example: 'STI College' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  organization?: string;
}

// ── Nested DTO: Venue selection ───────────────────────────────────────────────

export class VenueSelectionDto {
  @ApiProperty({ example: 'clx1234abcd' })
  @IsString()
  @IsNotEmpty()
  venueId: string;
}

// ── Nested DTO: Asset selection ───────────────────────────────────────────────

export class AssetSelectionDto {
  @ApiProperty({ example: 'clx5678efgh' })
  @IsString()
  @IsNotEmpty()
  assetId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

// ── Main DTO ──────────────────────────────────────────────────────────────────

export class CreateRequestDto {
  // Section I
  @ApiProperty({ example: 'JS Prom Night 2025' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  activityTitle: string;

  @ApiPropertyOptional({ example: 'A Night to Remember' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  theme?: string;

  // Section II
  @ApiProperty({ example: 'To celebrate academic achievements and foster camaraderie.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  objectives: string;

  // Section III
  // ISO 8601 datetime strings — the service converts to Date objects
  @ApiProperty({ example: '2025-06-15T08:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  activityStartAt: string;

  @ApiProperty({ example: '2025-06-15T22:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  activityEndAt: string;

  // Section IV — free text description
  @ApiPropertyOptional({ example: 'Multi Purpose Hall — needs full sound system setup' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  venueDescription?: string;

  @ApiPropertyOptional({ example: '2 wireless mics, 1 projector, extension cord' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  equipmentDescription?: string;

  // Section IV — structured venue selections (for booking/conflict detection)
  @ApiPropertyOptional({ type: [VenueSelectionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VenueSelectionDto)
  venues?: VenueSelectionDto[];

  // Section IV — structured asset selections
  @ApiPropertyOptional({ type: [AssetSelectionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetSelectionDto)
  assets?: AssetSelectionDto[];

  // Section V
  @ApiPropertyOptional({ type: [SpeakerDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpeakerDto)
  speakers?: SpeakerDto[];

  // Section VI
  @ApiPropertyOptional({ example: 'All BSIT and BSCS students' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  expectedAudience?: string;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  expectedHeadcount?: number;

  @ApiPropertyOptional({ example: 'Please ensure the sound system is tested before the event.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;

  // ── NEW: Approval Group ─────────────────────────────────────────────────────
  @ApiProperty({
    enum: ApprovalGroup,
    example: 'IT_CPE',
    description: 'The approval group that determines Department Head routing.',
  })
  @IsEnum(ApprovalGroup, { message: 'approvalGroup must be a valid ApprovalGroup' })
  @IsNotEmpty()
  approvalGroup: ApprovalGroup;
}