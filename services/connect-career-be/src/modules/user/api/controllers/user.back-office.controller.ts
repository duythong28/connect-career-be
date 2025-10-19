import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/identity/api/guards/roles.guard';
import { Roles } from 'src/modules/identity/api/decorators';
import { UserBackOfficeService } from '../services/user.back-office.service';
import {
  AdminUserListQueryDto,
  AdminUserResponseDto,
  UpdateUserRolesDto,
  UpdateUserStatusDto,
  UserStatsResponseDto,
} from '../dtos/user.back-office';

@ApiTags('Admin User Management')
@Controller('v1/users/back-office')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UserBackOfficeController {
  constructor(private readonly userBackOfficeService: UserBackOfficeService) {}

  @Get()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get all users with pagination and filtering' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: [AdminUserResponseDto],
  })
  async getAllUsers(@Query() query: AdminUserListQueryDto) {
    return this.userBackOfficeService.getUsers(query);
  }

  @Get('stats')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
    type: UserStatsResponseDto,
  })
  async getUserStats() {
    return this.userBackOfficeService.getUserStats();
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get user by ID with roles' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: AdminUserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserById(@Param('id') id: string) {
    return this.userBackOfficeService.getUserById(id);
  }

  @Put(':id/status')
  @Roles('super_admin', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user status' })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
    type: AdminUserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateUserStatusDto,
  ) {
    return this.userBackOfficeService.updateUserStatus(id, updateStatusDto);
  }

  @Put(':id/roles')
  @Roles('super_admin', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user roles' })
  @ApiResponse({
    status: 200,
    description: 'User roles updated successfully',
    type: AdminUserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateUserRoles(
    @Param('id') id: string,
    @Body() updateRolesDto: UpdateUserRolesDto,
  ) {
    return this.userBackOfficeService.updateUserRoles(id, updateRolesDto);
  }

  @Delete(':id')
  @Roles('super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async deleteUser(@Param('id') id: string) {
    return this.userBackOfficeService.deleteUser(id);
  }

  @Get(':id/sessions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get user active sessions' })
  @ApiResponse({
    status: 200,
    description: 'User sessions retrieved successfully',
  })
  async getUserSessions(@Param('id') id: string) {
    return this.userBackOfficeService.getUserSessions(id);
  }

  @Post(':id/sessions/revoke-all')
  @Roles('super_admin', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all user sessions' })
  @ApiResponse({
    status: 200,
    description: 'All user sessions revoked successfully',
  })
  async revokeAllUserSessions(@Param('id') id: string) {
    return this.userBackOfficeService.revokeAllUserSessions(id);
  }
}
