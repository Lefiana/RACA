// File: apps/backend/src/modules/auth/auth.module.ts
// CHANGED: removed RolesGuard APP_GUARD from here — moved to AppModule

import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';

import { auth }        from '../../auth';
import { SignUpHook }  from './hooks/sign-up.hook';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    BetterAuthModule.forRoot({
      auth,
      hooks: [SignUpHook],
    }),
    UsersModule,
  ],
  providers: [
    SignUpHook,
    // CHANGED: RolesGuard moved to AppModule so it registers AFTER
    // BetterAuthModule's AuthGuard
  ],
  exports: [UsersModule],
})
export class AuthModule {}