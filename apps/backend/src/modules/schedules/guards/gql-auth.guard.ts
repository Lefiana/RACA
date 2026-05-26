// File: apps/backend/src/modules/schedules/guards/gql-auth.guard.ts
// Purpose: Extracts the Better Auth session from the GraphQL context.
//          GraphQL requests carry the session cookie the same way REST requests do —
//          the difference is that NestJS guards receive an ExecutionContext that wraps
//          the GQL context, so we must switch to GQL context to get the request object.
// Dependencies: @nestjs/common, @nestjs/graphql, @thallesp/nestjs-better-auth

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { auth } from '../../../auth';

@Injectable()
export class GqlAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Switch from HTTP context to GraphQL context to access the raw request
    const ctx     = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      throw new UnauthorizedException('You must be signed in to access this resource');
    }

    // Attach session user to the request so the resolver can read it
    // via @CurrentUser() or context.req.user
    request.user = session.user;

    return true;
  }
}