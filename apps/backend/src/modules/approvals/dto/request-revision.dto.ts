// File: apps/backend/src/modules/approvals/dto/request-revision.dto.ts
// Purpose: DTO for POST /approvals/:stepId/revision — approver requests revision.
// Dependencies: class-validator, @nestjs/swagger, @repo/database

import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RevisionType } from '@repo/database';

export class RequestRevisionDto {
  @ApiProperty({
    enum: RevisionType,
    example: 'REVISION_RESUME',
    description: 'REVISION_RESUME: requestor edits, chain resumes from this step. REVISION_RESTART: full restart from Stage 1.',
  })
  @IsEnum(RevisionType, { message: 'revisionType must be REVISION_RESUME or REVISION_RESTART' })
  @IsNotEmpty()
  revisionType: RevisionType;

  @ApiProperty({
    example: 'Please update the expected headcount and attach the updated proposal.',
    description: 'Required. Minimum 10 characters. Explains what needs to be revised.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Remarks must be at least 10 characters' })
  remarks: string;
}