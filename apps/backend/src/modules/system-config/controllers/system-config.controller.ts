// File: apps/backend/src/modules/system-config/controllers/system-config.controller.ts
// Purpose: REST endpoints for system config management.
//          All writes are SUPER_ADMIN only. Reads allow SCHOOL_ADMIN too.
// Dependencies: @nestjs/common, @thallesp/nestjs-better-auth, SystemConfigService

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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { UserRole } from '@repo/database';

import { SystemConfigService }    from '../services/system-config.service';
import { UpsertSystemConfigDto }  from '../dto/upsert-system-config.dto';
import { UpdateSystemConfigDto }  from '../dto/update-system-config.dto';
import { QuerySystemConfigDto }   from '../dto/query-system-config.dto';
import { Roles }                  from '../../auth/decorators';

@ApiTags('System Config')
@ApiBearerAuth()
@Controller('system-config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  // POST /api/v1/system-config
  // Upsert — safe to call multiple times with the same key (idempotent).
  @Post()
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[SUPER_ADMIN] Create or update a config entry (upsert by key)' })
  async upsert(
    @Session() session: UserSession,
    @Body()    dto:     UpsertSystemConfigDto,
  ) {
    return this.systemConfigService.upsert(session.user.id, dto);
  }

  // GET /api/v1/system-config
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: '[Admin] Paginated list of all config entries' })
  async findAll(@Query() query: QuerySystemConfigDto) {
    return this.systemConfigService.findMany(query);
  }

  // GET /api/v1/system-config/:key
  // Declared before nothing dynamic conflicts — key is a plain string param.
  @Get(':key')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: '[Admin] Get a single config entry by key' })
  async findOne(@Param('key') key: string) {
    return this.systemConfigService.findOne(key);
  }

  // PATCH /api/v1/system-config/:key
  @Patch(':key')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[SUPER_ADMIN] Update a config value by key' })
  async update(
    @Session()     session: UserSession,
    @Param('key')  key:     string,
    @Body()        dto:     UpdateSystemConfigDto,
  ) {
    return this.systemConfigService.update(key, session.user.id, dto);
  }

  // DELETE /api/v1/system-config/:key
  // Protected keys are blocked at the service layer.
  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[SUPER_ADMIN] Delete a non-protected config entry' })
  async remove(@Param('key') key: string) {
    await this.systemConfigService.remove(key);
  }
}