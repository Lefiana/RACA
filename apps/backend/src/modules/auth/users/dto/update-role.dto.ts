// File: apps/backend/src/modules/auth/users/dto/update-role.dto.ts
// Purpose: Validated DTO for the PATCH /users/:id/role endpoint.
// Dependencies: class-validator, @raca/database

import { IsEnum, IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, ApprovalGroup } from '@repo/database';

export class UpdateRoleDto {
  @ApiProperty({ enum: UserRole, example: UserRole.ADVISER })
  @IsEnum(UserRole, { message: `role must be a valid UserRole` })
  @IsNotEmpty()
  role: UserRole;

  // ── NEW: Approval Group (required when role = DEPARTMENT_HEAD) ─────────────
  @ApiPropertyOptional({
    enum: ApprovalGroup,
    example: 'IT_CPE',
    description: 'Required when assigning DEPARTMENT_HEAD role. Must be unique per active Department Head.',
  })
  @ValidateIf((o: UpdateRoleDto) => o.role === UserRole.DEPARTMENT_HEAD)
  @IsEnum(ApprovalGroup, { message: 'approvalGroup must be a valid ApprovalGroup' })
  @IsNotEmpty()
  approvalGroup?: ApprovalGroup;
}