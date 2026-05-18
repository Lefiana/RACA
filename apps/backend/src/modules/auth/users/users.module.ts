// File: apps/api/src/modules/auth/users/users.module.ts
// Purpose: NestJS module for app-specific user management.
//          Exported so other modules (e.g. ApprovalsModule) can inject UsersService.
// Dependencies: UsersController, UsersService, UsersRepository

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService }    from './users.service';
import { UsersRepository } from './users.repository';

@Module({
  controllers: [UsersController],
  providers:   [UsersService, UsersRepository],
  exports:     [UsersService, UsersRepository],
})
export class UsersModule {}
