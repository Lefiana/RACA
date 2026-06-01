import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@repo/database';
import { UserSession } from '@thallesp/nestjs-better-auth';

export function enforceRoles(user: UserSession['user'], allowedRoles: UserRole[]) {
  if (user.role === UserRole.SUPER_ADMIN) {
    return; // SUPER_ADMIN can do everything
  }
  
  if (!allowedRoles.includes(user.role as UserRole)) {
    throw new ForbiddenException(
      `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
    );
  }
}