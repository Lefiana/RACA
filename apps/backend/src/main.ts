// File: apps/api/src/main.ts
// Purpose: NestJS application bootstrap.
//          Two critical Better Auth requirements:
//            1. bodyParser: false — Better Auth handles its own body parsing
//            2. Global prefix must EXCLUDE /api/auth/* routes
// Dependencies: @nestjs/core, @nestjs/common, @nestjs/swagger

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Required by @thallesp/nestjs-better-auth.
    // The library re-adds body parsers for all non-auth routes automatically.
    bodyParser: false,
  });

  // Global validation pipe — applies class-validator rules from all DTOs.
  // whitelist strips unknown properties; forbidNonWhitelisted throws on them.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS — credentials: true is required for Better Auth's cookie-based sessions
  app.enableCors({
    origin:      process.env.FRONTEND_URL ?? 'http://localhost:6000',
    credentials: true,
    methods:     ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Global prefix for all our app routes: /api/v1/*
  // Better Auth routes (/api/auth/*) must be EXCLUDED here —
  // they are mounted directly by @thallesp/nestjs-better-auth
  // and do not go through the NestJS global prefix.
  app.setGlobalPrefix('api/v1', {
    // Named wildcard required by path-to-regexp v8+ (used in NestJS 11)
    // This excludes all /api/auth/* routes from the global prefix so
    // Better Auth can handle them directly.
    exclude: ['/api/auth/*path'],
  });

  // Swagger — available at /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('RACA Platform API')
    .setDescription('Request for Approval of Campus Activity / Venue — REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = process.env.PORT ?? 6001;
  await app.listen(port);

  console.log(`\n🚀 RACA API        → http://localhost:${port}/api/v1`);
  console.log(`🔐 Better Auth     → http://localhost:${port}/api/auth`);
  console.log(`📖 Swagger docs    → http://localhost:${port}/api/docs`);
}

bootstrap();