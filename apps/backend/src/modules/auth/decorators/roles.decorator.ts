// File: apps/api/src/modules/auth/decorators/roles.decorator.ts
// Purpose: @Roles() decorator — attaches required roles metadata to a route.
//          RolesGuard reads this metadata on every request to enforce RBAC.
// Dependencies: @nestjs/common, @repo/database

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@repo/database';

export const ROLES_KEY = 'roles';

// Usage: @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);