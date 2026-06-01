// File: apps/backend/src/modules/requests/controllers/requests.controller.ts
// Purpose: HTTP layer for the RACA request lifecycle.
//          Extracts session user from Better Auth, delegates all logic
//          to RequestsService. No business logic lives here.
// Dependencies: @nestjs/common, @thallesp/nestjs-better-auth,
//               RequestsService, DTOs, RolesGuard

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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';

import { RequestsService }   from '../services/requests.service';
import { CreateRequestDto }  from '../dto/create-request.dto';
import { UpdateRequestDto, QueryRequestDto } from '../dto/query-update.dto';

// UserRole is read from session.user — the Better Auth additionalFields
// make role available on the session user object directly.

@ApiTags('Requests')
@ApiBearerAuth()
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  // POST /api/v1/requests
  // Creates a new request as DRAFT.
  // Any authenticated user can create a request.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new RACA request (saved as DRAFT)' })
  async create(
    @Session() session: UserSession,
    @Body()    dto:     CreateRequestDto,
  ) {
    return this.requestsService.create(session.user.id, dto);
  }

  // POST /api/v1/requests/:id/submit
  // Transitions a DRAFT request to PENDING and scaffolds approval steps.
  // Performs venue conflict check before accepting.
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a DRAFT request for approval' })
  async submit(
    @Session()    session: UserSession,
    @Param('id')  id:      string,
  ) {
    return this.requestsService.submit(
      id,
      session.user.id,
      (session.user as any).role,
    );
  }

  // GET /api/v1/requests
  // Paginated list. Scope depends on role:
  //   REQUESTOR       → own requests only
  //   ADMIN roles     → all requests
  //   APPROVER roles  → own requests (approver view added in Approvals module)
  @Get()
  @ApiOperation({ summary: 'List requests (scoped by role)' })
  async findAll(
    @Session() session: UserSession,
    @Query()   query:   QueryRequestDto,
  ) {
    return this.requestsService.findMany(
      session.user.id,
      (session.user as any).role,
      query,
    );
  }

  // GET /api/v1/requests/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get a single request with full detail' })
  async findOne(
    @Session()    session: UserSession,
    @Param('id')  id:      string,
  ) {
    return this.requestsService.findOne(
      id,
      session.user.id,
      (session.user as any).role,
    );
  }

  // PATCH /api/v1/requests/:id
  // Edit a DRAFT or PENDING request.
  // Editing a PENDING request resets all approval steps.
  @Patch(':id')
  @ApiOperation({ summary: 'Edit a DRAFT or PENDING request' })
  async update(
    @Session()    session: UserSession,
    @Param('id')  id:      string,
    @Body()       dto:     UpdateRequestDto,
  ) {
    return this.requestsService.update(
      id,
      session.user.id,
      (session.user as any).role,
      dto,
    );
  }

  // DELETE /api/v1/requests/:id
  // Cancels a DRAFT or PENDING request (soft delete).
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a DRAFT or PENDING request' })
  async cancel(
    @Session()    session: UserSession,
    @Param('id')  id:      string,
  ) {
    await this.requestsService.cancel(
      id,
      session.user.id,
      (session.user as any).role,
    );
  }
}
