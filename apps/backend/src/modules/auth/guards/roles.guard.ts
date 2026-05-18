// File: apps/api/src/modules/auth/guards/roles.guard.ts
// Purpose: RBAC enforcement guard. Applied globally via APP_GUARD in AppModule.
//          Better Auth's built-in guard (from AuthModule.forRoot) has already
//          validated the session before this guard runs — so request.user
//          is guaranteed to be a valid, active session user here.
//          This guard only checks whether the user's role satisfies the
//          @Roles() decorator on the route.
// Dependencies: @nestjs/common, @nestjs/core, @raca/database (UserRole enum)

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@repo/database';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Read the roles required by the route (set via @Roles(...))
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() on this route → any authenticated user is allowed through.
    // The upstream Better Auth guard already enforces authentication.
    if (!requiredRoles || requiredRoles.length === 0) return true;

    // request.user is set by @thallesp/nestjs-better-auth's AuthGuard
    // after session validation. The shape matches Better Auth's session user
    // extended with our additionalFields (role, isActive, department).
    const { user } = context.switchToHttp().getRequest();

    if (!user) return false;

    // SUPER_ADMIN bypasses all role restrictions
    if (user.role === UserRole.SUPER_ADMIN) return true;

    if (!requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException(
        `This action requires one of the following roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
