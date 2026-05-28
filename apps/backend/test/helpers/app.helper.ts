// File: apps/backend/test/helpers/app.helper.ts
// Purpose: Boots the full NestJS application against the test database.
// Dependencies: @nestjs/testing, supertest, AppModule

import { Test, TestingModule }              from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest                             from 'supertest';
import { AppModule }                         from '../../src/app.module';

let app:   INestApplication;
// CHANGED: use any — supertest v7 and @types/supertest are misaligned,
// typing the agent is not worth the version rabbit hole
let agent: any;

export async function bootApp(): Promise<{
  app:   INestApplication;
  agent: any;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api/v1', {
    exclude: ['/api/auth/*path'],
  });

  await app.init();

  agent = supertest(app.getHttpServer());

  return { app, agent };
}

export async function closeApp(): Promise<void> {
  if (app) {
    await app.close();
  }
}

export function getAgent(): any {
  if (!agent) throw new Error('App not booted — call bootApp() in beforeAll first');
  return agent;
}