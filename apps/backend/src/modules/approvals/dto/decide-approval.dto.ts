// File: apps/backend/src/modules/approvals/dto/decide-approval.dto.ts
// Purpose: Shared DTO for both approve and reject endpoints.
//          remarks is optional on approve.
//          rejectionReason is enforced as required on reject at the service layer.
// Dependencies: class-validator, @nestjs/swagger

import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DecideApprovalDto {
  @ApiPropertyOptional({
    example: 'Approved. Ensure the venue is set up by 7AM.',
    description: 'Optional remarks. Required when rejecting.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;

  @ApiPropertyOptional({
    example: 'Venue is unavailable on the requested date.',
    description: 'Required when rejecting. Ignored on approve.',
  })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Rejection reason must be at least 10 characters' })
  @MaxLength(1000)
  rejectionReason?: string;
}
