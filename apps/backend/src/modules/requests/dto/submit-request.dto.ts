// File: apps/backend/src/modules/requests/dto/submit-request.dto.ts
// Purpose: DTO for POST /requests/:id/submit — requestor selects their adviser.
// Dependencies: class-validator, @nestjs/swagger

import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitRequestDto {
  @ApiProperty({
    example: 'clx1234abcd',
    description: 'ID of the adviser the requestor has selected to review this request.',
  })
  @IsString()
  @IsNotEmpty()
  adviserId: string;
}