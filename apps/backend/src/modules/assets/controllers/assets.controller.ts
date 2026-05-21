// File: apps/backend/src/modules/assets/controllers/assets.controller.ts
// Purpose: HTTP layer for asset management, checkout/return, and CSV import.
//          Multer is used for CSV file uploads — interceptor applied per-endpoint.
// Dependencies: @nestjs/common, @nestjs/platform-express, @thallesp/nestjs-better-auth

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { memoryStorage } from 'multer';

import { AssetsService }      from '../services/assets.service';
import { CreateAssetDto }    from '../dto/create-asset.dto';
import { UpdateAssetDto }    from '../dto/update-asset.dto';
import { QueryAssetDto }     from '../dto/query-asset.dto';
import { SetAssetStatusDto } from '../dto/set-asset-status.dto';
import { ProcessCheckoutDto } from '../dto/process-checkout.dto';
import { RolesGuard }        from '../../auth/guards/roles.guard';

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('assets')
@UseGuards(RolesGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // POST /api/v1/assets
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an asset (custodian roles + SUPER_ADMIN)' })
  async create(
    @Session() session: UserSession,
    @Body()    dto:     CreateAssetDto,
  ) {
    return this.assetsService.create(
      session.user.id,
      (session.user as any).role,
      dto,
    );
  }

  // GET /api/v1/assets
  @Get()
  @ApiOperation({ summary: 'List assets (scoped by custodian role)' })
  async findAll(
    @Session() session: UserSession,
    @Query()   query:   QueryAssetDto,
  ) {
    return this.assetsService.findMany((session.user as any).role, query);
  }

  // GET /api/v1/assets/checkouts/active
  @Get('checkouts/active')
  @ApiOperation({ summary: 'List active/overdue checkouts for the custodian' })
  async findActiveCheckouts(@Session() session: UserSession) {
    return this.assetsService.findActiveCheckouts((session.user as any).role);
  }

  // GET /api/v1/assets/import/template
  // Returns a CSV file download with correct columns and a sample row
  @Get('import/template')
  @ApiOperation({ summary: 'Download CSV import template for your asset category' })
  async getCsvTemplate(
    @Session() session: UserSession,
    @Res()     res:     Response,
  ) {
    const { content, filename } = this.assetsService.getCsvTemplate(
      (session.user as any).role,
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  }

  // GET /api/v1/assets/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get an asset with checkout history' })
  async findOne(
    @Session()    session: UserSession,
    @Param('id')  id:      string,
  ) {
    return this.assetsService.findOne(id, (session.user as any).role);
  }

  // PATCH /api/v1/assets/:id
  @Patch(':id')
  @ApiOperation({ summary: 'Update asset details' })
  async update(
    @Session()    session: UserSession,
    @Param('id')  id:      string,
    @Body()       dto:     UpdateAssetDto,
  ) {
    return this.assetsService.update(id, (session.user as any).role, dto);
  }

  // PATCH /api/v1/assets/:id/status
  @Patch(':id/status')
  @ApiOperation({ summary: 'Set asset status (AVAILABLE, MAINTENANCE, DAMAGED, etc.)' })
  async setStatus(
    @Session()    session: UserSession,
    @Param('id')  id:      string,
    @Body()       dto:     SetAssetStatusDto,
  ) {
    return this.assetsService.setStatus(id, (session.user as any).role, dto);
  }

  // DELETE /api/v1/assets/:id
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an asset' })
  async remove(
    @Session()    session: UserSession,
    @Param('id')  id:      string,
  ) {
    await this.assetsService.remove(id, (session.user as any).role);
  }

  // POST /api/v1/assets/checkout/:checkoutId/process
  @Post('checkout/:checkoutId/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process asset checkout (mark as checked out)' })
  async processCheckout(
    @Session()               session:    UserSession,
    @Param('checkoutId')     checkoutId: string,
    @Body()                  dto:        ProcessCheckoutDto,
  ) {
    return this.assetsService.processCheckout(
      checkoutId,
      session.user.id,
      (session.user as any).role,
      dto,
    );
  }

  // POST /api/v1/assets/checkout/:checkoutId/return
  @Post('checkout/:checkoutId/return')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process asset return with condition recording' })
  async processReturn(
    @Session()               session:    UserSession,
    @Param('checkoutId')     checkoutId: string,
    @Body()                  dto:        ProcessCheckoutDto,
  ) {
    return this.assetsService.processReturn(
      checkoutId,
      session.user.id,
      (session.user as any).role,
      dto,
    );
  }

  // POST /api/v1/assets/import/csv
  // Multer uses memoryStorage so the file buffer is available directly.
  // memoryStorage is appropriate here since CSV files are small.
  // For large files consider diskStorage with a temp path.
  @Post('import/csv')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk import/update assets via CSV file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits:  { fileSize: 5 * 1024 * 1024 }, // 5MB max for CSV
      fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
          cb(null, true);
        } else {
          cb(new Error('Only CSV files are accepted'), false);
        }
      },
    }),
  )
  async importCsv(
    @Session()                    session: UserSession,
    @UploadedFile()               file:    Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    return this.assetsService.importCsv(
      session.user.id,
      (session.user as any).role,
      file.buffer,
    );
  }
}
