// File: apps/backend/src/modules/system-config/services/system-config.service.ts
// Purpose: Business logic for system config management.
//          Protects runtime-critical keys from deletion.
//          SUPER_ADMIN only for writes — enforced at controller level via @Roles().
// Dependencies: SystemConfigRepository, @nestjs/common

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { SystemConfigRepository } from '../repositories/system-config.repository';
import { UpsertSystemConfigDto }  from '../dto/upsert-system-config.dto';
import { UpdateSystemConfigDto }  from '../dto/update-system-config.dto';
import { QuerySystemConfigDto }   from '../dto/query-system-config.dto';

// Keys actively read at runtime by other modules.
// These can be updated but never deleted — removing them breaks runtime behavior.
const PROTECTED_KEYS = new Set<string>([
  'reservation_buffer_min',
  'reference_number_prefix',
  'allowed_mime_types',
  'max_upload_size_mb',
]);

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(private readonly systemConfigRepo: SystemConfigRepository) {}

  // ── Upsert (POST) ─────────────────────────────────────────────────────────

  async upsert(userId: string, dto: UpsertSystemConfigDto) {
    const result = await this.systemConfigRepo.upsert({
      key:         dto.key,
      value:       dto.value,
      description: dto.description,
      updatedBy:   userId,
    });

    this.logger.log(`[SystemConfigService] upserted key: ${dto.key} by userId: ${userId}`);
    return result;
  }

  // ── Update (PATCH) ────────────────────────────────────────────────────────

  async update(key: string, userId: string, dto: UpdateSystemConfigDto) {
    const existing = await this.systemConfigRepo.findByKey(key);
    if (!existing) throw new NotFoundException(`Config key "${key}" not found`);

    const result = await this.systemConfigRepo.update(key, {
      value:       dto.value,
      description: dto.description,
      updatedBy:   userId,
    });

    this.logger.log(`[SystemConfigService] updated key: ${key} by userId: ${userId}`);
    return result;
  }

  // ── Find many ─────────────────────────────────────────────────────────────

  async findMany(query: QuerySystemConfigDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.systemConfigRepo.findMany({
      skip:   (page - 1) * limit,
      take:   limit,
      search: query.search,
    });

    // Flag protected keys so the frontend can disable the delete button
    const enriched = data.map(entry => ({
      ...entry,
      isProtected: PROTECTED_KEYS.has(entry.key),
    }));

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages:  Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  // ── Find one ──────────────────────────────────────────────────────────────

  async findOne(key: string) {
    const config = await this.systemConfigRepo.findByKey(key);
    if (!config) throw new NotFoundException(`Config key "${key}" not found`);

    return {
      ...config,
      isProtected: PROTECTED_KEYS.has(config.key),
    };
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async remove(key: string) {
    if (PROTECTED_KEYS.has(key)) {
      throw new BadRequestException(
        `"${key}" is a protected system key and cannot be deleted. You can update its value instead.`,
      );
    }

    const existing = await this.systemConfigRepo.findByKey(key);
    if (!existing) throw new NotFoundException(`Config key "${key}" not found`);

    await this.systemConfigRepo.delete(key);
    this.logger.log(`[SystemConfigService] deleted key: ${key}`);
  }
}