// File: apps/backend/src/modules/attachments/dto/upload-attachment.dto.ts
// Purpose: DTO for the multipart/form-data upload request.
//          The file itself is handled by Multer — this DTO covers
//          the non-file fields sent alongside the file.
// Dependencies: class-validator, @nestjs/swagger

import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UploadAttachmentDto {
  @ApiPropertyOptional({
    example: 'Proposed Program',
    description: 'Human-readable label for the file (e.g. Proposed Program, Budget Proposal)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;
}
