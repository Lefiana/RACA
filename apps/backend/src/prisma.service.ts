// File: apps/backend/src/prisma.service.ts
// Purpose: NestJS injectable PrismaClient — single connected instance for the whole app.
//          All repositories inject this instead of importing prisma directly.
// Dependencies: @nestjs/common, @prisma/client
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}