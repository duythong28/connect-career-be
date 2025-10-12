import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import { OrganizationRBACService } from '../services/organization-rbac.service';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';
import * as decorators from 'src/modules/identity/api/decorators';
import {
  AcceptInvitationDto,
  InviteUserDto,
  UpdateMemberRoleDto,
} from '../dtos/organization.rbac.dto';

@ApiTags('Organization RBAC')
@Controller('/v1/organizations-rbac')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationRBACController {
  constructor(
    private readonly organizationRBACService: OrganizationRBACService,
  ) {}

  @Post('with-rbac')
  @ApiOperation({ summary: 'Create organization with RBAC setup' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully with RBAC',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - user already has organization',
  })
  async createOrganizationWithRBAC(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.organizationRBACService.createOrganizationWithOwner(
      user.sub,
      createOrganizationDto,
    );
  }

  @Get(':organizationId/members')
  @ApiOperation({ summary: 'Get organization members' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'List of organization members' })
  async getOrganizationMembers(
    @Param('organizationId') organizationId: string,
  ) {
    return this.organizationRBACService.getOrganizationMembers(organizationId);
  }

  @Post(':organizationId/members')
  @ApiOperation({ summary: 'Add member to organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  async addMemberToOrganization(
    @Param('organizationId') organizationId: string,
    @Body() body: { userId: string; roleId: string },
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.organizationRBACService.addMemberToOrganization(
      organizationId,
      body.userId,
      body.roleId,
      user.sub,
    );
  }

  @Put(':organizationId/members/:memberId/role')
  @ApiOperation({ summary: 'Update member role' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'memberId', description: 'Member user ID' })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  async updateMemberRole(
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.organizationRBACService.updateMemberRole(
      organizationId,
      memberId,
      updateRoleDto.roleId,
      user.sub,
    );
  }

  @Delete(':organizationId/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'memberId', description: 'Member user ID' })
  @ApiResponse({ status: 204, description: 'Member removed successfully' })
  async removeMemberFromOrganization(
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    await this.organizationRBACService.removeMemberFromOrganization(
      organizationId,
      memberId,
      user.sub,
    );
  }

  @Post(':organizationId/invite')
  @ApiOperation({ summary: 'Invite user to organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 201, description: 'Invitation sent successfully' })
  async inviteUserToOrganization(
    @Param('organizationId') organizationId: string,
    @Body() inviteUserDto: InviteUserDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.organizationRBACService.inviteUserToOrganization(
      organizationId,
      inviteUserDto.email,
      inviteUserDto.roleId,
      user.sub,
    );
  }

  @Get(':organizationId/invitations')
  @ApiOperation({ summary: 'Get pending invitations for organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'List of pending invitations' })
  async getPendingInvitations(@Param('organizationId') organizationId: string) {
    return this.organizationRBACService.getPendingInvitations(organizationId);
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept organization invitation' })
  @ApiResponse({ status: 201, description: 'Invitation accepted successfully' })
  async acceptInvitation(
    @Body() acceptInvitationDto: AcceptInvitationDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.organizationRBACService.acceptInvitation(
      acceptInvitationDto.token,
      user.sub,
    );
  }

  @Delete('invitations/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel organization invitation' })
  @ApiParam({ name: 'invitationId', description: 'Invitation ID' })
  @ApiResponse({
    status: 204,
    description: 'Invitation cancelled successfully',
  })
  async cancelInvitation(
    @Param('invitationId') invitationId: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    await this.organizationRBACService.cancelInvitation(invitationId, user.sub);
  }

  @Get(':organizationId/roles')
  @ApiOperation({ summary: 'Get organization roles' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'List of organization roles' })
  async getOrganizationRoles(@Param('organizationId') organizationId: string) {
    return this.organizationRBACService.getOrganizationRoles(organizationId);
  }

  @Get('me/organizations')
  @ApiOperation({ summary: 'Get user organizations' })
  @ApiResponse({ status: 200, description: 'List of user organizations' })
  async getUserOrganizations(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.organizationRBACService.getUserOrganizations(user.sub);
  }

  @Get('me/organizations/:organizationId/role')
  @ApiOperation({ summary: 'Get user role in organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'User role in organization' })
  async getUserRoleInOrganization(
    @Param('organizationId') organizationId: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.organizationRBACService.getUserRoleInOrganization(
      user.sub,
      organizationId,
    );
  }

  // ========== Permission Checks ==========
  @Get(':organizationId/permissions/check')
  @ApiOperation({ summary: 'Check user permission in organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiQuery({
    name: 'action',
    description: 'Permission action (create, read, update, delete, manage)',
  })
  @ApiQuery({
    name: 'resource',
    description:
      'Resource type (jobs, applications, members, organization, reports, settings)',
  })
  @ApiResponse({ status: 200, description: 'Permission check result' })
  async checkPermission(
    @Param('organizationId') organizationId: string,
    @Query('action') action: string,
    @Query('resource') resource: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    const hasPermission = await this.organizationRBACService.hasPermission(
      user.sub,
      organizationId,
      action as any,
      resource as any,
    );
    return { hasPermission };
  }

  @Get(':organizationId/stats')
  @ApiOperation({ summary: 'Get organization statistics' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization statistics' })
  async getOrganizationStats(@Param('organizationId') organizationId: string) {
    return this.organizationRBACService.getOrganizationStats(organizationId);
  }

  // ========== Helper Methods ==========
  @Get(':organizationId/is-owner')
  @ApiOperation({ summary: 'Check if user is owner of organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Owner status' })
  async isOwner(
    @Param('organizationId') organizationId: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    const isOwner = await this.organizationRBACService.isOwner(
      user.sub,
      organizationId,
    );
    return { isOwner };
  }

  @Get(':organizationId/is-admin')
  @ApiOperation({ summary: 'Check if user is admin of organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Admin status' })
  async isAdmin(
    @Param('organizationId') organizationId: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    const isAdmin = await this.organizationRBACService.isAdmin(
      user.sub,
      organizationId,
    );
    return { isAdmin };
  }

  @Post('invitations/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Decline organization invitation by token' })
  @ApiResponse({ status: 204, description: 'Invitation declined successfully' })
  async declineInvitationByToken(@Body() body: { token: string }) {
    await this.organizationRBACService.declineInvitation(body.token);
  }
}
