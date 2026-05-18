// File: apps/api/src/modules/auth/auth.module.ts
// Purpose: Configures the @thallesp/nestjs-better-auth integration.
//          - Mounts Better Auth handler at /api/auth/*
//          - Registers the global AuthGuard (all routes protected by default)
//          - Registers the SignUpHook for post-registration defaults
//          - Exports UsersModule so other feature modules can use UsersService
// Dependencies: @thallesp/nestjs-better-auth, SignUpHook, UsersModule, RolesGuard

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';

import { auth }         from '../../auth';
import { SignUpHook }   from './hooks/sign-up.hook';
import { RolesGuard }   from './guards/roles.guard';
import { UsersModule }  from './users/users.module';

@Module({
  imports: [
    // BetterAuthModule.forRoot:
    //   1. Mounts Better Auth's request handler at /api/auth/*
    //   2. Registers the global AuthGuard that validates sessions on every request
    //   3. Re-adds body parsers for all non-auth routes (because main.ts disables them)
    //   4. Wires NestJS DI hooks (SignUpHook) into the Better Auth lifecycle
    BetterAuthModule.forRoot({
      auth,
      // Register DI-aware hooks — Better Auth calls these during its own operations.
      // SignUpHook.afterUserCreate fires after every new user is created.
      hooks: [SignUpHook],
    }),

    UsersModule,
  ],
  providers: [
    SignUpHook,

    // RolesGuard applied globally via APP_GUARD.
    // It runs AFTER the Better Auth AuthGuard has already validated the session,
    // so request.user is always populated when RolesGuard checks it.
    {
      provide:  APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [UsersModule],
})
export class AuthModule {}
