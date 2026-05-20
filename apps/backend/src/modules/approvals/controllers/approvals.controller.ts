// File: apps/backend/src/modules/approvals/controllers/approvals.controller.ts
// Purpose: HTTP layer for approval decisions.
//          Extracts session user, delegates all logic to ApprovalsService.
// Dependencies: @nestjs/common, @thallesp/nestjs-better-auth,
//               ApprovalsService, DTOs, RolesGuard, Roles decorator

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { UserRole } from '@repo/database';

import { ApprovalsService }                        from '../services/approvals.service';
import { DecideApprovalDto }                        from '../dto/decide-approval.dto';
import { QueryApprovalsDto }                        from '../dto/query-approvals.dto';
import { RolesGuard }                   from '../../auth/guards/roles.guard';
import { Roles }                        from '../../auth/decorators';

// All approver roles — any of these can reach the pending queue
const APPROVER_ROLES = [
  UserRole.ADVISER,
  UserRole.DEPARTMENT_HEAD,
  UserRole.MIS,
  UserRole.BUILDING_ADMIN,
  UserRole.STUDENT_AFFAIRS,
  UserRole.ACADEMIC_HEAD,
  UserRole.SCHOOL_ADMIN,
  UserRole.SUPER_ADMIN,
];

@ApiTags('Approvals')
@ApiBearerAuth()
@Controller('approvals')
@UseGuards(RolesGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  // GET /api/v1/approvals/pending
  // Returns the paginated list of steps currently awaiting the session user.
  // Only approver roles can access this — requestors have no pending queue.
  @Get('pending')
  @Roles(...APPROVER_ROLES)
  @ApiOperation({ summary: 'Get pending approval steps for the current user' })
  async findPending(
    @Session() session: UserSession,
    @Query()   query:   QueryApprovalsDto,
  ) {
    return this.approvalsService.findPending(
      session.user.id,
      (session.user as any).role,
      query,
    );
  }

  // GET /api/v1/approvals/request/:requestId
  // Full approval timeline for a specific request.
  // Used by the request detail page to render the approval chain.
  @Get('request/:requestId')
  @ApiOperation({ summary: 'Get all approval steps for a request' })
  async findByRequest(@Param('requestId') requestId: string) {
    return this.approvalsService.findByRequest(requestId);
  }

  // POST /api/v1/approvals/:stepId/approve
  @Post(':stepId/approve')
  @HttpCode(HttpStatus.OK)
  @Roles(...APPROVER_ROLES)
  @ApiOperation({ summary: 'Approve an approval step' })
  async approve(
    @Session()        session: UserSession,
    @Param('stepId')  stepId:  string,
    @Body()           dto:     DecideApprovalDto,
  ) {
    return this.approvalsService.approve(
      stepId,
      session.user.id,
      session.user.name,
      (session.user as any).role,
      dto,
    );
  }

  // POST /api/v1/approvals/:stepId/reject
  // rejectionReason is required — enforced in the service layer
  @Post(':stepId/reject')
  @HttpCode(HttpStatus.OK)
  @Roles(...APPROVER_ROLES)
  @ApiOperation({ summary: 'Reject an approval step (rejectionReason required)' })
  async reject(
    @Session()        session: UserSession,
    @Param('stepId')  stepId:  string,
    @Body()           dto:     DecideApprovalDto,
  ) {
    return this.approvalsService.reject(
      stepId,
      session.user.id,
      session.user.name,
      (session.user as any).role,
      dto,
    );
  }
}
