// File: apps/backend/src/modules/assets/assets.module.ts
// CHANGED: added PrismaService
import { Module } from '@nestjs/common';
import { AssetsController }  from './controllers/assets.controller';
import { AssetsService }     from './services/assets.service';
import { AssetsRepository }  from './repositories/assets.repository';
import { CsvImportService }  from './services/csv-import.service';
import { PrismaService }     from '../../prisma.service';

@Module({
  controllers: [AssetsController],
  providers:   [AssetsService, AssetsRepository, CsvImportService, PrismaService],
  exports:     [AssetsService],
})
export class AssetsModule {}