// File: apps/backend/src/modules/assets/dto/create-asset.dto.ts
// Purpose: DTO for creating a single asset record.
// Dependencies: class-validator, @nestjs/swagger, @repo/database

import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetCondition, AssetCustodian } from '@repo/database';

export class CreateAssetDto {
  @ApiProperty({ example: 'CUB-PRJ-003' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  assetTag: string;

  @ApiProperty({ example: 'Projector Unit 3' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Backup projector unit' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 'Projector' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @ApiPropertyOptional({ example: 'Epson' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ example: 'EB-X41' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ example: 'EPS-003' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ example: 'MIS Office — Storage Room' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ enum: AssetCondition, default: AssetCondition.GOOD })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  // custodianRole is NOT accepted from the client on the public create endpoint.
  // It is stamped from the session user's role in the service.
  // This field is only used by SUPER_ADMIN who can assign any custodian.
  @ApiPropertyOptional({ enum: AssetCustodian })
  @IsOptional()
  @IsEnum(AssetCustodian)
  custodianRole?: AssetCustodian;
}
