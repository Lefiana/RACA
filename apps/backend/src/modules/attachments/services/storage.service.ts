// File: apps/backend/src/modules/attachments/services/storage.service.ts
// Purpose: All filesystem operations for file storage.
//          Completely isolated from business logic — AttachmentsService
//          calls this but knows nothing about paths or fs operations.
//          To swap to S3 later: replace the body of each method only.
// Dependencies: @nestjs/common, fs, path, uuid

import * as fs   from 'fs';
import * as path from 'path';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  // Base upload directory from env — defaults to ./uploads
  private get uploadRoot(): string {
    return process.env.UPLOAD_DEST ?? './uploads';
  }

  // Builds the storage path for a file.
  // Format: {context}/{YYYY}/{MM}/{contextId}/{uuid}-{sanitizedOriginalName}
  // Context is either 'requests' or 'steps'.
  buildStoragePath(params: {
    context:     'requests' | 'steps';
    contextId:   string;
    originalName: string;
  }): { storedName: string; storagePath: string; absolutePath: string } {
    const { context, contextId, originalName } = params;

    const now       = new Date();
    const year      = now.getFullYear().toString();
    const month     = String(now.getMonth() + 1).padStart(2, '0');

    // Sanitize original filename — remove anything that isn't alphanumeric, dot, dash, underscore
    const sanitized = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const storedName = `${uuidv4()}-${sanitized}`;

    // Relative path stored in DB — portable across environments
    const storagePath = path.join(context, year, month, contextId, storedName);

    // Absolute path used for actual disk operations
    const absolutePath = path.join(this.uploadRoot, storagePath);

    return { storedName, storagePath, absolutePath };
  }

  // Saves a buffer to disk, creating all necessary directories.
  async save(absolutePath: string, buffer: Buffer): Promise<void> {
    try {
      const dir = path.dirname(absolutePath);

      // Create directory tree if it doesn't exist
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(absolutePath, buffer);

      this.logger.log(`[StorageService] saved: ${absolutePath}`);
    } catch (err: any) {
      this.logger.error(`[StorageService] save failed: ${err.message}`);
      throw new InternalServerErrorException('Failed to save file to storage');
    }
  }

  // Deletes a file from disk.
  // Fails silently if file doesn't exist — DB record is deleted regardless.
  async delete(storagePath: string): Promise<void> {
    const absolutePath = path.join(this.uploadRoot, storagePath);
    try {
      await fs.promises.unlink(absolutePath);
      this.logger.log(`[StorageService] deleted: ${absolutePath}`);
    } catch (err: any) {
      // ENOENT means file already gone — not an error worth throwing
      if (err.code !== 'ENOENT') {
        this.logger.error(`[StorageService] delete failed: ${err.message}`);
      }
    }
  }

  // Returns the absolute path for a stored file.
  // Used by the download endpoint to stream the file.
  resolveAbsolutePath(storagePath: string): string {
    return path.join(this.uploadRoot, storagePath);
  }

  // Checks whether a file exists on disk.
  async exists(storagePath: string): Promise<boolean> {
    const absolutePath = this.resolveAbsolutePath(storagePath);
    try {
      await fs.promises.access(absolutePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }
}
