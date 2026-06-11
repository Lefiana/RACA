// File: apps/backend/src/modules/attachments/repositories/attachments.repository.ts
// CHANGED: inject PrismaService
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

@Injectable()
export class AttachmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.attachment.findUnique({
      where:   { id },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
  }

  async findByRequestId(requestId: string, label?: string) {
    return this.prisma.attachment.findMany({
      where: {
        requestId,
        ...(label && { label: { contains: label, mode: 'insensitive' } }),
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByStepId(approvalStepId: string) {
    return this.prisma.attachment.findMany({
      where:   { approvalStepId },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    requestId?:      string;
    approvalStepId?: string;
    uploadedById:    string;
    originalName:    string;
    storedName:      string;
    storagePath:     string;
    mimeType:        string;
    sizeBytes:       number;
    label?:          string;
  }) {
    return this.prisma.attachment.create({ data });
  }

  async delete(id: string) {
    return this.prisma.attachment.delete({ where: { id } });
  }
}