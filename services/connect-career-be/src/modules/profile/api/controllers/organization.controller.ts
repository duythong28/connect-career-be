import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { OrganizationService } from '../services/organization.service';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import * as decorators from 'src/modules/identity/api/decorators';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';
import { CurrentUser, Public } from 'src/modules/identity/api/decorators';
import { OrganizationQueryDto } from '../dtos/organization-query.dto';

@Controller('/v1/organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrganization(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.organizationService.createOrganization(
      user.sub,
      createOrganizationDto,
    );
  }

  @Get()
  @Public()
  async getAllOrganizations(@Query() query: OrganizationQueryDto) {
    return this.organizationService.getAllOrganizations(query);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyOrganization(@CurrentUser() user: decorators.CurrentUserPayload) {
    return this.organizationService.getMyOrganizations(user.sub);
  }
}
