import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@repo/database';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Import your configured Better Auth instance
// (Adjust this relative path to point to your apps/api/src/auth.ts file)
import { auth } from '../../../auth'; 

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // We only care about HTTP requests (ignore GraphQL/WebSockets for this guard)
    if (context.getType() !== 'http') return true;

    // 1. Read the @Roles() decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If the route has no @Roles() decorator, let it pass
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();

    // 2. See if the user was already attached by a prior middleware
    let user = request.user ?? request.session?.user;

    // 3. THE FIX: If the user is missing, fetch the session directly from Better Auth
    if (!user) {
      try {
        // We pass the raw request headers so Better Auth can read the session cookie/token
        const sessionData = await auth.api.getSession({
          headers: request.headers as Record<string, string>,
        });

        if (sessionData) {
          user = sessionData.user;
          // Attach it to the request so the @Session() decorator doesn't have to fetch it again
          request.session = sessionData.session;
          request.user = user;
        }
      } catch (error) {
        throw new UnauthorizedException('Failed to validate session');
      }
    }

    // 4. Role Validation Logic
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // SUPER_ADMIN gets a global bypass
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Check if the user's role is in the allowed list
    if (!requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException(
        `This action requires one of the following roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}