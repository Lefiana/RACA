// File: apps/backend/src/modules/attachments/controllers/attachments.controller.ts
// Purpose: HTTP layer for attachment management.
//          Multer uses memoryStorage — file buffer is available immediately
//          and passed directly to StorageService for disk write.
//          Download streams the file back using res.sendFile().
// Dependencies: @nestjs/common, @nestjs/platform-express, @thallesp/nestjs-better-auth

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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

import { AttachmentsService }    from '../services/attachments.service';
import { UploadAttachmentDto }   from '../dto/upload-attachment.dto';
import { QueryAttachmentDto }    from '../dto/query-attachment.dto';
// Multer config — memoryStorage keeps the file in buffer until
// StorageService writes it to disk in the correct directory structure.
// Size limit is a hard cap at the HTTP layer — service also checks against SystemConfig.
const multerOptions = {
  storage: memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 }, // 50MB hard cap — SystemConfig may be lower
};

@ApiTags('Attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  // POST /api/v1/attachments/request/:requestId
  // Upload a file to a request (requestor or any active approver)
  @Post('request/:requestId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a file attachment to a request' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file:  { type: 'string', format: 'binary' },
        label: { type: 'string', example: 'Proposed Program' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadToRequest(
    @Session()              session:   UserSession,
    @Param('requestId')     requestId: string,
    @UploadedFile()         file:      Express.Multer.File,
    @Query()                dto:       UploadAttachmentDto,
  ) {
    if (!file) throw new Error('No file provided');

    return this.attachmentsService.uploadToRequest(
      requestId,
      session.user.id,
      file,
      dto,
    );
  }

  // POST /api/v1/attachments/step/:stepId
  // Upload a file to an approval step (assigned approver only)
  @Post('step/:stepId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a file attachment to an approval step' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file:  { type: 'string', format: 'binary' },
        label: { type: 'string', example: 'Signed Endorsement Letter' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadToStep(
    @Session()          session: UserSession,
    @Param('stepId')    stepId:  string,
    @UploadedFile()     file:    Express.Multer.File,
    @Query()            dto:     UploadAttachmentDto,
  ) {
    if (!file) throw new Error('No file provided');

    return this.attachmentsService.uploadToStep(
      stepId,
      session.user.id,
      file,
      dto,
    );
  }

  // GET /api/v1/attachments/request/:requestId
  // List all attachments on a request
  @Get('request/:requestId')
  @ApiOperation({ summary: 'List all attachments for a request' })
  async findByRequest(
    @Param('requestId') requestId: string,
    @Query()            query:     QueryAttachmentDto,
  ) {
    return this.attachmentsService.findByRequest(requestId, query);
  }

  // GET /api/v1/attachments/:id/download
  // Stream the file back to the client with the original filename
  @Get(':id/download')
  @ApiOperation({ summary: 'Download an attachment file' })
  async download(
    @Session()    session: UserSession,
    @Param('id')  id:      string,
    @Res()        res:     Response,
  ) {
    const { absolutePath, originalName, mimeType } =
      await this.attachmentsService.getFileForDownload(id, session.user.id);

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(originalName)}"`,
    );

    // sendFile streams the file — no need to read it into memory
    res.sendFile(absolutePath, { root: '/' }, (err) => {
      if (err) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Failed to stream file',
        });
      }
    });
  }

  // DELETE /api/v1/attachments/:id
  // Deletes the file from disk and removes the DB record
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an attachment (uploader or SUPER_ADMIN only)' })
  async remove(
    @Session()    session: UserSession,
    @Param('id')  id:      string,
  ) {
    await this.attachmentsService.delete(
      id,
      session.user.id,
      (session.user as any).role,
    );
  }
}
