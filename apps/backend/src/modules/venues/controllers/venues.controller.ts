// File: apps/backend/src/modules/venues/controllers/venues.controller.ts
// Purpose: HTTP endpoints for venue management.
//          Read endpoints are open to all authenticated users.
//          Write endpoints are restricted via service-layer role check.
// Dependencies: @nestjs/common, @thallesp/nestjs-better-auth, VenuesService

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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';

import { VenuesService }      from '../services/venues.service';
import { CreateVenueDto }     from '../dto/create-venue.dto';
import { UpdateVenueDto }     from '../dto/update-venue.dto';
import { QueryVenueDto }      from '../dto/query-venue.dto';
import { SetVenueStatusDto }  from '../dto/set-venue-status.dto';

@ApiTags('Venues')
@ApiBearerAuth()
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  // POST /api/v1/venues
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a venue (BUILDING_ADMIN, SUPER_ADMIN)' })
  async create(
    @Session() session: UserSession,
    @Body()    dto:     CreateVenueDto,
  ) {
    return this.venuesService.create((session.user as any).role, dto);
  }

  // GET /api/v1/venues
  @Get()
  @ApiOperation({ summary: 'List venues with pagination and filters' })
  async findAll(@Query() query: QueryVenueDto) {
    return this.venuesService.findMany(query);
  }

  // GET /api/v1/venues/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get a venue with booking history' })
  async findOne(@Param('id') id: string) {
    return this.venuesService.findOne(id);
  }

  // GET /api/v1/venues/:id/availability?from=2025-06-01&to=2025-06-30
  @Get(':id/availability')
  @ApiOperation({ summary: 'Get venue availability for a date range' })
  @ApiQuery({ name: 'from', required: true, example: '2025-06-01T00:00:00.000Z' })
  @ApiQuery({ name: 'to',   required: true, example: '2025-06-30T23:59:59.000Z' })
  async getAvailability(
    @Param('id')     id:   string,
    @Query('from')   from: string,
    @Query('to')     to:   string,
  ) {
    return this.venuesService.getAvailability(id, from, to);
  }

  // PATCH /api/v1/venues/:id
  @Patch(':id')
  @ApiOperation({ summary: 'Update venue details (BUILDING_ADMIN, SUPER_ADMIN)' })
  async update(
    @Session()    session: UserSession,
    @Param('id')  id:      string,
    @Body()       dto:     UpdateVenueDto,
  ) {
    return this.venuesService.update(id, (session.user as any).role, dto);
  }

  // PATCH /api/v1/venues/:id/status
  @Patch(':id/status')
  @ApiOperation({ summary: 'Set venue status (BUILDING_ADMIN, SUPER_ADMIN)' })
  async setStatus(
    @Session()    session: UserSession,
    @Param('id')  id:      string,
    @Body()       dto:     SetVenueStatusDto,
  ) {
    return this.venuesService.setStatus(
      id,
      (session.user as any).role,
      session.user.id,
      dto,
    );
  }

  // DELETE /api/v1/venues/:id
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a venue (BUILDING_ADMIN, SUPER_ADMIN)' })
  async remove(
    @Session()    session: UserSession,
    @Param('id')  id:      string,
  ) {
    await this.venuesService.remove(id, (session.user as any).role);
  }
}
