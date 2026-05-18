// File: apps/api/src/modules/auth/users/dto/update-role.dto.ts
// Purpose: Validated DTO for the PATCH /users/:id/role endpoint.
// Dependencies: class-validator, @raca/database

import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@repo/database';

export class UpdateRoleDto {
  @ApiProperty({ enum: UserRole, example: UserRole.ADVISER })
  @IsEnum(UserRole, { message: `role must be a valid UserRole` })
  @IsNotEmpty()
  role: UserRole;
}
