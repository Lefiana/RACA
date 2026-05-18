// File: apps/api/src/modules/auth/users/users.controller.ts
// Purpose: REST endpoints for app-specific user management.
//          Better Auth exposes /api/auth/sign-up, /api/auth/sign-in, etc.
//          This controller handles /api/v1/users/* — profile, listing, role updates.
//
// Key Better Auth decorators used here (from @thallesp/nestjs-better-auth):
//   @Session()        — extracts the validated session from the request.
//                       The global AuthGuard has already verified it; this just reads it.
//   @AllowAnonymous() — skips the global AuthGuard for a specific route.
//   UserSession       — TypeScript type for the session object (user + session metadata).
//
// Dependencies: @thallesp/nestjs-better-auth, UsersService, RolesGuard

import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { UserRole } from '@repo/database';

import { UsersService }   from './users.service';
import { UpdateRoleDto }  from './dto/update-role.dto';
import { RolesGuard }     from '../guards/roles.guard';
import { Roles }          from '../decorators/index';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(RolesGuard) // Layered on top of the global Better Auth AuthGuard
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/v1/users/me
  // Returns the current authenticated user's full app profile.
  // @Session() extracts the already-validated session.
  // We re-fetch from DB (not just return session.user) to get
  // the freshest role/isActive values in case an admin changed them.
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Session() session: UserSession) {
    return this.usersService.findById(session.user.id);
  }

  // GET /api/v1/users
  // Paginated user list — SUPER_ADMIN and SCHOOL_ADMIN only
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: '[Admin] List all users with pagination and filters' })
  @ApiQuery({ name: 'page',   required: false, type: Number })
  @ApiQuery({ name: 'limit',  required: false, type: Number })
  @ApiQuery({ name: 'role',   required: false, enum: UserRole })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
    @Query('role')   role?:   UserRole,
    @Query('search') search?: string,
  ) {
    return this.usersService.findMany({
      page:   page  ? parseInt(page,  10) : 1,
      limit:  limit ? parseInt(limit, 10) : 20,
      role,
      search,
    });
  }

  // GET /api/v1/users/:id
  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: '[Admin] Get a user by ID' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  // PATCH /api/v1/users/:id/role
  // Only SUPER_ADMIN can reassign roles
  @Patch(':id/role')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Update a user role' })
  async updateRole(
    @Param('id')  id:  string,
    @Body()       dto: UpdateRoleDto,
  ) {
    return this.usersService.updateRole(id, dto.role);
  }

  // PATCH /api/v1/users/:id/toggle-active
  @Patch(':id/toggle-active')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Toggle user active/inactive status' })
  async toggleActive(@Param('id') id: string) {
    return this.usersService.toggleActive(id);
  }

  // DELETE /api/v1/users/:id
  // Soft-delete only — audit logs are preserved
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Soft-delete a user' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
  }
}
