// File: apps/backend/src/modules/attachments/services/attachments.service.ts
// CHANGED: inject PrismaService instead of importing prisma directly
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as mimeTypes from 'mime-types';
import { ApprovalStatus, RequestStatus } from '@repo/database';

import { PrismaService }         from '../../../prisma.service';
import { AttachmentsRepository } from '../repositories/attachments.repository';
import { StorageService }        from './storage.service';
import { UploadAttachmentDto }   from '../dto/upload-attachment.dto';
import { QueryAttachmentDto }    from '../dto/query-attachment.dto';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly attachmentsRepo: AttachmentsRepository,
    private readonly storageService:  StorageService,
    private readonly eventEmitter:    EventEmitter2,
    private readonly prisma:          PrismaService, // CHANGED
  ) {}

  async uploadToRequest(requestId: string, userId: string, file: Express.Multer.File, dto: UploadAttachmentDto) {
    const request = await this.prisma.request.findFirst({
      where:   { id: requestId, deletedAt: null },
      include: { approvalSteps: { select: { approverId: true } } },
    });

    if (!request) throw new NotFoundException('Request not found');

    const terminalStatuses: RequestStatus[] = [RequestStatus.CANCELLED, RequestStatus.COMPLETED];
    if (terminalStatuses.includes(request.status)) {
      throw new BadRequestException(`Cannot upload to a ${request.status.toLowerCase()} request`);
    }

    const isRequestor = request.requestedById === userId;
    const isApprover  = request.approvalSteps.some(s => s.approverId === userId);
    if (!isRequestor && !isApprover) {
      throw new ForbiddenException('You do not have access to this request');
    }

    await this.validateFile(file);

    const { storedName, storagePath, absolutePath } = this.storageService.buildStoragePath({
      context:      'requests',
      contextId:    requestId,
      originalName: file.originalname,
    });

    await this.storageService.save(absolutePath, file.buffer);

    const attachment = await this.attachmentsRepo.create({
      requestId,
      uploadedById: userId,
      originalName: file.originalname,
      storedName,
      storagePath,
      mimeType:  file.mimetype,
      sizeBytes: file.size,
      label:     dto.label,
    });

    this.eventEmitter.emit('attachment.uploaded', { attachmentId: attachment.id, requestId, uploadedById: userId });
    this.logger.log(`[AttachmentsService] uploaded to request ${requestId}: ${file.originalname}`);
    return attachment;
  }

  async uploadToStep(stepId: string, userId: string, file: Express.Multer.File, dto: UploadAttachmentDto) {
    const step = await this.prisma.approvalStep.findUnique({ where: { id: stepId } });

    if (!step) throw new NotFoundException('Approval step not found');

    if (step.approverId !== userId) {
      throw new ForbiddenException('Only the assigned approver can upload to this step');
    }

    if (step.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(`Cannot upload to a step that has already been ${step.status.toLowerCase()}`);
    }

    await this.validateFile(file);

    const { storedName, storagePath, absolutePath } = this.storageService.buildStoragePath({
      context:      'steps',
      contextId:    stepId,
      originalName: file.originalname,
    });

    await this.storageService.save(absolutePath, file.buffer);

    const attachment = await this.attachmentsRepo.create({
      approvalStepId: stepId,
      uploadedById:   userId,
      originalName:   file.originalname,
      storedName,
      storagePath,
      mimeType:  file.mimetype,
      sizeBytes: file.size,
      label:     dto.label,
    });

    this.eventEmitter.emit('attachment.uploaded', { attachmentId: attachment.id, stepId, uploadedById: userId });
    this.logger.log(`[AttachmentsService] uploaded to step ${stepId}: ${file.originalname}`);
    return attachment;
  }

  async findByRequest(requestId: string, query: QueryAttachmentDto) {
    const request = await this.prisma.request.findFirst({ where: { id: requestId, deletedAt: null } });
    if (!request) throw new NotFoundException('Request not found');
    return this.attachmentsRepo.findByRequestId(requestId, query.label);
  }

  async getFileForDownload(id: string, userId: string) {
    const attachment = await this.attachmentsRepo.findById(id);
    if (!attachment) throw new NotFoundException('Attachment not found');

    const exists = await this.storageService.exists(attachment.storagePath);
    if (!exists) throw new NotFoundException('File not found on storage');

    return {
      absolutePath: this.storageService.resolveAbsolutePath(attachment.storagePath),
      originalName: attachment.originalName,
      mimeType:     attachment.mimeType,
    };
  }

  async delete(id: string, userId: string, userRole: string) {
    const attachment = await this.attachmentsRepo.findById(id);
    if (!attachment) throw new NotFoundException('Attachment not found');

    if (attachment.uploadedById !== userId && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('You can only delete your own attachments');
    }

    await this.storageService.delete(attachment.storagePath);
    await this.attachmentsRepo.delete(id);

    this.eventEmitter.emit('attachment.deleted', { attachmentId: id, requestId: attachment.requestId, stepId: attachment.approvalStepId, deletedById: userId });
    this.logger.log(`[AttachmentsService] deleted attachment: ${id}`);
  }

  private async validateFile(file: Express.Multer.File): Promise<void> {
    const [mimeConfig, sizeConfig] = await Promise.all([
      this.prisma.systemConfig.findUnique({ where: { key: 'allowed_mime_types' } }),
      this.prisma.systemConfig.findUnique({ where: { key: 'max_upload_size_mb'  } }),
    ]);

    const allowedMimes = (mimeConfig?.value ?? 'application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      .split(',').map(m => m.trim());

    const maxSizeMb = parseInt(sizeConfig?.value ?? '10', 10);
    const maxBytes  = maxSizeMb * 1024 * 1024;

    if (file.size > maxBytes) {
      throw new BadRequestException(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds the maximum of ${maxSizeMb}MB`);
    }

    const extensionMime  = mimeTypes.lookup(file.originalname);
    const declaredMime   = file.mimetype;
    const isAllowed      = allowedMimes.includes(declaredMime) || (!!extensionMime && allowedMimes.includes(extensionMime));

    if (!isAllowed) {
      throw new BadRequestException(`File type "${declaredMime}" is not allowed. Allowed: PDF, JPEG, PNG, DOCX`);
    }
  }
}