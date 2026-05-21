// File: apps/backend/src/modules/attachments/dto/query-attachment.dto.ts
// Purpose: Query params for listing attachments.
//          Currently minimal — expandable later with pagination if needed.
// Dependencies: class-validator, @nestjs/swagger

import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAttachmentDto {
  // Optional filter by label (e.g. only show "Proposed Program" attachments)
  @ApiPropertyOptional({ example: 'Proposed Program' })
  @IsOptional()
  @IsString()
  label?: string;
}
