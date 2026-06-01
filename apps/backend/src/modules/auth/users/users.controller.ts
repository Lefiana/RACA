import { Controller, Get, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { UserRole } from '@repo/database';

import { UsersService } from './users.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { enforceRoles } from '../utils/role-check.util'; // <-- Import the utility

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Session() session: UserSession) {
    return this.usersService.findById(session.user.id);
  }

  @Get()
  @ApiOperation({ summary: '[Admin] List all users' })
  async findAll(
    @Session() session: UserSession, // <-- 1. Grab session
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
  ) {
    // 2. Enforce roles immediately
    enforceRoles(session.user, [UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]);

    return this.usersService.findMany({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      role,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Get a user by ID' })
  async findOne(@Param('id') id: string, @Session() session: UserSession) {
    enforceRoles(session.user, [UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]);
    return this.usersService.findById(id);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: '[Admin] Update a user role' })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Session() session: UserSession,
  ) {
    enforceRoles(session.user, [UserRole.SUPER_ADMIN]); // Only SUPER_ADMIN
    return this.usersService.updateRole(id, dto.role);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: '[Admin] Toggle user active/inactive status' })
  async toggleActive(@Param('id') id: string, @Session() session: UserSession) {
    enforceRoles(session.user, [UserRole.SUPER_ADMIN]);
    return this.usersService.toggleActive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Soft-delete a user' })
  async remove(@Param('id') id: string, @Session() session: UserSession) {
    enforceRoles(session.user, [UserRole.SUPER_ADMIN]);
    await this.usersService.remove(id);
  }
}