// File: apps/api/src/modules/auth/decorators/current-user.decorator.ts
// Purpose: @CurrentUser() param decorator — extracts the authenticated user
//          from request.user, which is set by @thallesp/nestjs-better-auth's
//          AuthGuard after session validation.
//
// Usage:
//   async myRoute(@CurrentUser() user: SessionUser) { ... }
//
// Dependencies: @nestjs/common

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);