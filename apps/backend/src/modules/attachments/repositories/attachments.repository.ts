// File: apps/backend/src/modules/attachments/repositories/attachments.repository.ts
// Purpose: All Prisma queries for attachment metadata.
//          The repository never touches the filesystem — that is StorageService's job.
// Dependencies: @repo/database, @nestjs/common

import { Injectable } from '@nestjs/common';
import { prisma } from '@repo/database';

@Injectable()
export class AttachmentsRepository {

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findById(id: string) {
    return prisma.attachment.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findByRequestId(requestId: string, label?: string) {
    return prisma.attachment.findMany({
      where: {
        requestId,
        ...(label && { label: { contains: label, mode: 'insensitive' } }),
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByStepId(approvalStepId: string) {
    return prisma.attachment.findMany({
      where:   { approvalStepId },
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Writes ────────────────────────────────────────────────────────────────

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
    return prisma.attachment.create({ data });
  }

  // Hard delete — file is physically removed by StorageService before this runs
  async delete(id: string) {
    return prisma.attachment.delete({ where: { id } });
  }
}
