// File: apps/backend/src/modules/auth/users/users.module.ts
// CHANGED: added PrismaService
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService }    from './users.service';
import { UsersRepository } from './users.repository';
import { PrismaService }   from '../../../prisma.service';

@Module({
  controllers: [UsersController],
  providers:   [UsersService, UsersRepository, PrismaService],
  exports:     [UsersService, UsersRepository],
})
export class UsersModule {}