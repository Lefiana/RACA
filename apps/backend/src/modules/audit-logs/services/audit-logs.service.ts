// File: apps/backend/src/modules/audit-logs/services/audit-logs.service.ts
// Purpose: Create audit log entries and serve paginated reads to admins.
//          No delete or update methods — append-only by design.
// Dependencies: AuditLogsRepository, @nestjs/common

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditLogsRepository } from '../repositories/audit-logs.repository';
import { QueryAuditLogsDto }   from '../dto/query-audit-logs.dto';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly auditLogsRepo: AuditLogsRepository) {}

  // ── Write ─────────────────────────────────────────────────────────────────

  // Called by the listener only — never directly from a controller.
  async create(data: {
    performedById?: string;
    requestId?:     string;
    action:         string;
    entity:         string;
    entityId?:      string;
    snapshot?:      Record<string, any>;
    ipAddress?:     string;
    userAgent?:     string;
  }) {
    const log = await this.auditLogsRepo.create(data);
    this.logger.log(
      `[AuditLogsService] logged: ${data.action} on ${data.entity}${data.entityId ? ` (${data.entityId})` : ''}`,
    );
    return log;
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findMany(query: QueryAuditLogsDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.auditLogsRepo.findMany({
      skip:      (page - 1) * limit,
      take:      limit,
      action:    query.action,
      entity:    query.entity,
      userId:    query.userId,
      requestId: query.requestId,
      dateFrom:  query.dateFrom,
      dateTo:    query.dateTo,
      search:    query.search,
    });

    return {
      data,
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

  async findById(id: string) {
    const log = await this.auditLogsRepo.findById(id);
    if (!log) throw new NotFoundException('Audit log entry not found');
    return log;
  }

  async findByRequestId(requestId: string) {
    return this.auditLogsRepo.findByRequestId(requestId);
  }
}