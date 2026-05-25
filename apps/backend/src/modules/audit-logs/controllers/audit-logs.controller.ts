// File: apps/backend/src/modules/audit-logs/controllers/audit-logs.controller.ts
// Purpose: Read-only REST endpoints for audit log inspection.
//          Restricted to SCHOOL_ADMIN and SUPER_ADMIN only.
//          No write endpoints exist — append-only by design.
// Dependencies: @nestjs/common, @thallesp/nestjs-better-auth, AuditLogsService

import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@repo/database';

import { AuditLogsService }  from '../services/audit-logs.service';
import { QueryAuditLogsDto } from '../dto/query-audit-logs.dto';
import { RolesGuard }        from '../../auth/guards/roles.guard';
import { Roles }             from '../../auth/decorators';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  // GET /api/v1/audit-logs
  @Get()
  @ApiOperation({ summary: '[Admin] Paginated audit log with filters' })
  async findAll(@Query() query: QueryAuditLogsDto) {
    return this.auditLogsService.findMany(query);
  }

  // GET /api/v1/audit-logs/request/:requestId
  // Full chronological audit trail for one request.
  // Declared before /:id so NestJS resolves it as a static segment first.
  @Get('request/:requestId')
  @ApiOperation({ summary: '[Admin] Full audit trail for a specific request' })
  async findByRequest(@Param('requestId') requestId: string) {
    return this.auditLogsService.findByRequestId(requestId);
  }

  // GET /api/v1/audit-logs/:id
  @Get(':id')
  @ApiOperation({ summary: '[Admin] Get a single audit log entry' })
  async findOne(@Param('id') id: string) {
    return this.auditLogsService.findById(id);
  }
}