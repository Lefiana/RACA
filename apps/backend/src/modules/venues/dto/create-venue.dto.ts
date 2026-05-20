// File: apps/backend/src/modules/venues/dto/create-venue.dto.ts
// Purpose: DTO for creating a new venue record.
// Dependencies: class-validator, @nestjs/swagger

import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVenueDto {
  @ApiProperty({ example: 'Multi Purpose Hall' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: '7th Floor Multi Purpose Hall' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'Main Building' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  building?: string;

  @ApiPropertyOptional({ example: '7th Floor' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  floor?: string;

  @ApiProperty({ example: 300 })
  @IsInt()
  @IsPositive()
  capacity: number;

  @ApiPropertyOptional({
    example: ['aircon', 'sound_system', 'stage'],
    description: 'List of available features/amenities',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
