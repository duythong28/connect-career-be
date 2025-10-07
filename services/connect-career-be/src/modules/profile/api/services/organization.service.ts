import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as organizationEntity from '../../domain/repository/organization.repository';
import { Organization } from '../../domain/entities/organization.entity';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';
import { UpdateOrganizationDto } from '../dtos/update-organization.dto';
import {
  OrganizationQueryDto,
  OrganizationSearchDto,
} from '../dtos/organization-query.dto';
import { FindOptionsWhere } from 'typeorm';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly organizationRepository: organizationEntity.OrganizationRepository,
  ) {}

  async createOrganization(
    userId: string,
    dto: CreateOrganizationDto,
  ): Promise<Organization> {
    const existingOrg = await this.organizationRepository.findByUserId(userId);
    if (existingOrg) {
      throw new BadRequestException('Organization already exists');
    }
    const organizationData = {
      ...dto,
      userId,
      isActive: true,
      isPublic: false,
      isVerified: false,
    };
    return this.organizationRepository.create(organizationData);
  }

  async updateOrganizationById(
    id: string,
    dto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    const updateData: Partial<Organization> = { ...dto };
    const updatedOrganization = await this.organizationRepository.update(
      id,
      updateData,
    );
    if (!updatedOrganization) {
      throw new NotFoundException(
        'Organization not found or could not be updated',
      );
    }

    return updatedOrganization;
  }

  async getOrganizationById(id: string): Promise<Organization> {
    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    if (!organization.isPublic && !organization.isActive) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  async getMyOrganizations(userId: string): Promise<Organization[]> {
    const organizations =
      await this.organizationRepository.findByUserId(userId);
    if (!organizations) {
      throw new NotFoundException('Organizations not found');
    }
    return [organizations];
  }

  async getAllOrganizations(query: OrganizationQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      industryId,
      country,
      city,
      organizationSize,
      organizationType,
      isHiring,
      isVerified,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    if (search) {
      const organizations =
        await this.organizationRepository.searchOrganizations(search);
      const total = organizations.length;
      const skip = (page - 1) * limit;
      const data = organizations.slice(skip, skip + limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const where: FindOptionsWhere<Organization> = {
      isPublic: true,
      isActive: true,
    };

    if (industryId !== undefined) where.industryId = industryId;
    if (country !== undefined) where.country = country;
    if (city !== undefined) where.city = city;
    if (organizationSize !== undefined)
      where.organizationSize = organizationSize;
    if (organizationType !== undefined)
      where.organizationType = organizationType;
    if (isHiring !== undefined) where.isHiring = isHiring;
    if (isVerified !== undefined) where.isVerified = isVerified;
    const relations = ['user', 'locations', 'logoFile', 'bannerFile'];
    const sortField = sortBy as keyof Organization;
    return this.organizationRepository.findPaginated(
      { page, limit, sortBy: sortField, sortOrder },
      where,
      relations,
    );
  }

  async searchOrganizations(searchDto: OrganizationSearchDto) {
    const {
      search,
      industryIds,
      country,
      city,
      organizationSize,
      organizationType,
      isHiring,
      isVerified,
      minEmployeeCount,
      maxEmployeeCount,
      workScheduleTypes,
      page = 1,
      limit = 20,
    } = searchDto;

    const organizations = await this.organizationRepository.advancedSearch({
      searchTerm: search,
      industryIds,
      country,
      city,
      organizationSize,
      organizationType,
      isHiring,
      isVerified,
      minEmployeeCount,
      maxEmployeeCount,
      workScheduleTypes,
    });
    const total = organizations.length;
    const skip = (page - 1) * limit;
    const data = organizations.slice(skip, skip + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filters: {
        search,
        industryIds,
        country,
        city,
        organizationSize,
        organizationType,
        isHiring,
        isVerified,
        minEmployeeCount,
        maxEmployeeCount,
        workScheduleTypes,
      },
    };
  }

  async quickSearch(searchTerm: string, limit: number = 10) {
    const organizations =
      await this.organizationRepository.searchOrganizations(searchTerm);

    return organizations.slice(0, limit).map((org) => ({
      id: org.id,
      name: org.name,
      abbreviation: org.abbreviation,
      logo: org.logoFile?.secureUrl,
      isVerified: org.isVerified,
      city: org.city,
      country: org.country,
      organizationSize: org.organizationSize,
    }));
  }
}
