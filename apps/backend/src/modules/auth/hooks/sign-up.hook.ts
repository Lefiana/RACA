// File: apps/api/src/modules/auth/hooks/sign-up.hook.ts
// Purpose: Runs after Better Auth creates a new user record.
//          Ensures role = REQUESTOR and isActive = true are always set
//          as defaults regardless of what the client sends.
//          The role field has input: false in auth.ts so clients can never
//          set it directly — this hook is the only code that sets it.
// Dependencies: @thallesp/nestjs-better-auth, @raca/database

import { Injectable } from '@nestjs/common';
import {
  DatabaseHook,
  AfterCreate,
} from '@thallesp/nestjs-better-auth';
import { prisma } from '@repo/database';

// @DatabaseHook() marks this class as a Better Auth database lifecycle hook.
// @thallesp/nestjs-better-auth picks it up automatically when registered
// in the AuthModule providers array.
@DatabaseHook()
@Injectable()
export class SignUpHook {
  // @AfterCreate('user') fires after Better Auth inserts a new row into the user table.
  // The `user` parameter is the full newly-created user record.
  @AfterCreate('user')
  async afterUserCreate(user: { id: string; role?: string; isActive?: boolean }) {
    // Better Auth sets additionalFields defaults, but we enforce them here
    // at the database level as a safety net — in case the client somehow
    // bypassed the input: false restriction.
    if (user.role !== 'REQUESTOR' || user.isActive !== true) {
      await prisma.user.update({
        where: { id: user.id },
        data:  { role: 'REQUESTOR', isActive: true },
      });
    }
  }
}
