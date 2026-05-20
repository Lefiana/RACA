// File: apps/backend/src/modules/assets/assets.module.ts
// Purpose: NestJS module for asset inventory management.
//          MulterModule is NOT imported here — the FileInterceptor in the
//          controller uses inline multer config (memoryStorage) which is
//          simpler and doesn't require module-level Multer registration.
// Dependencies: AssetsController, AssetsService, AssetsRepository, CsvImportService

import { Module } from '@nestjs/common';
import { AssetsController }  from './controllers/assets.controller';
import { AssetsService }     from './services/assets.service';
import { AssetsRepository }  from './repositories/assets.repository';
import { CsvImportService }  from './services/csv-import.service';

@Module({
  controllers: [AssetsController],
  providers:   [AssetsService, AssetsRepository, CsvImportService],
  exports:     [AssetsService],
})
export class AssetsModule {}
