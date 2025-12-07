import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/domain/interfaces/base.repository';
import { Organization } from '../entities/organization.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

export interface IOrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  findByUserId(userId: string): Promise<Organization | null>;
  findByName(name: string): Promise<Organization[]>;
  findByIndustryId(industryId: string): Promise<Organization[]>;
  findByLocation(country: string, city?: string): Promise<Organization[]>;
  findBySize(size: string): Promise<Organization[]>;
  findByType(type: string): Promise<Organization[]>;
  searchOrganizations(searchTerm: string): Promise<Organization[]>;
  findHiring(): Promise<Organization[]>;
  findVerified(): Promise<Organization[]>;
}
@Injectable()
export class OrganizationRepository
  extends BaseRepository<Organization>
  implements IOrganizationRepository
{
  constructor(
    @InjectRepository(Organization)
    protected readonly repository: Repository<Organization>,
  ) {
    super(repository);
  }
  async findById(id: string): Promise<Organization | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'locations', 'logoFile', 'industry', 'reviews'],
    });
  }
  async findByUserId(userId: string): Promise<Organization | null> {
    return this.repository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }
  findByName(name: string): Promise<Organization[]> {
    return this.repository.find({
      where: [
        { name: ILike(`%${name}%`) },
        { abbreviation: ILike(`%${name}%`) },
      ],
      relations: ['user', 'locations'],
    });
  }
  findByIndustryId(industryId: string): Promise<Organization[]> {
    return this.repository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.user', 'user')
      .leftJoinAndSelect('org.locations', 'locations')
      .leftJoinAndSelect('org.logoFile', 'logoFile')
      .leftJoinAndSelect('org.bannerFile', 'bannerFile')
      .where('org.industryId = :industryId', { industryId })
      .orWhere(':industryId = ANY(org.subIndustryIds)', { industryId })
      .andWhere('org.deletedAt IS NULL')
      .andWhere('org.isPublic = true')
      .orderBy('org.isVerified', 'DESC')
      .addOrderBy('org.createdAt', 'DESC')
      .getMany();
  }
  findByLocation(country: string, city?: string): Promise<Organization[]> {
    const query = this.repository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.user', 'user')
      .leftJoinAndSelect('org.locations', 'locations')
      .leftJoinAndSelect('org.logoFile', 'logoFile')
      .leftJoinAndSelect('org.bannerFile', 'bannerFile')
      .where('org.country = :country', { country })
      .andWhere('org.deletedAt IS NULL')
      .andWhere('org.isPublic = true');

    if (city) {
      query.andWhere(
        '(org.city = :city OR EXISTS (SELECT 1 FROM organizationLocations l WHERE l.organizationId = org.id AND l.city = :city))',
        { city },
      );
    }

    return query
      .orderBy('org.isVerified', 'DESC')
      .addOrderBy('org.createdAt', 'DESC')
      .getMany();
  }
  findBySize(size: string): Promise<Organization[]> {
    return this.repository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.user', 'user')
      .leftJoinAndSelect('org.locations', 'locations')
      .leftJoinAndSelect('org.logoFile', 'logoFile')
      .leftJoinAndSelect('org.bannerFile', 'bannerFile')
      .where('org.organizationSize = :size', { size })
      .andWhere('org.deletedAt IS NULL')
      .andWhere('org.isPublic = true')
      .orderBy('org.isVerified', 'DESC')
      .addOrderBy('org.createdAt', 'DESC')
      .getMany();
  }
  findByType(type: string): Promise<Organization[]> {
    return this.repository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.user', 'user')
      .leftJoinAndSelect('org.locations', 'locations')
      .leftJoinAndSelect('org.logoFile', 'logoFile')
      .leftJoinAndSelect('org.bannerFile', 'bannerFile')
      .where('org.organizationType = :type', { type })
      .andWhere('org.deletedAt IS NULL')
      .andWhere('org.isPublic = true')
      .orderBy('org.isVerified', 'DESC')
      .addOrderBy('org.createdAt', 'DESC')
      .getMany();
  }
  searchOrganizations(searchTerm: string): Promise<Organization[]> {
    const search = `%${searchTerm}%`;
    return this.repository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.user', 'user')
      .leftJoinAndSelect('org.locations', 'locations')
      .leftJoinAndSelect('org.logoFile', 'logoFile')
      .leftJoinAndSelect('org.bannerFile', 'bannerFile')
      .leftJoinAndSelect('org.industry', 'industry')
      .where('org.deletedAt IS NULL')
      .andWhere('org.isPublic = true')
      .andWhere('org.isActive = true')
      .andWhere(
        `(
        LOWER(org.name) LIKE LOWER(:search) OR
        LOWER(org.abbreviation) LIKE LOWER(:search) OR
        LOWER(org.shortDescription) LIKE LOWER(:search) OR
        LOWER(org.tagline) LIKE LOWER(:search) OR
        :searchTerm = ANY(
          SELECT LOWER(unnest(org.formerNames))
        )
      )`,
        { search, searchTerm: searchTerm.toLowerCase() },
      )
      .orderBy(
        `CASE 
        WHEN LOWER(org.name) = LOWER(:searchTerm) THEN 1
        WHEN LOWER(org.abbreviation) = LOWER(:searchTerm) THEN 2
        WHEN LOWER(org.name) LIKE LOWER(:exactSearch) THEN 3
        ELSE 4
      END`,
        'ASC',
      )
      .setParameter('searchTerm', searchTerm.toLowerCase())
      .setParameter('exactSearch', `${searchTerm.toLowerCase()}%`)
      .addOrderBy('org.isVerified', 'DESC')
      .addOrderBy('org.employeeCount', 'DESC', 'NULLS LAST')
      .addOrderBy('org.createdAt', 'DESC')
      .limit(50) // Limit search results
      .getMany();
  }
  async findHiring(): Promise<Organization[]> {
    return this.repository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.user', 'user')
      .leftJoinAndSelect('org.locations', 'locations')
      .leftJoinAndSelect('org.logoFile', 'logoFile')
      .leftJoinAndSelect('org.bannerFile', 'bannerFile')
      .where('org.deletedAt IS NULL')
      .andWhere('org.isPublic = true')
      .andWhere('org.isActive = true')
      .andWhere('org.isHiring = true')
      .orderBy('org.isVerified', 'DESC')
      .addOrderBy('org.createdAt', 'DESC')
      .getMany();
  }
  async findVerified(): Promise<Organization[]> {
    return this.repository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.user', 'user')
      .leftJoinAndSelect('org.locations', 'locations')
      .leftJoinAndSelect('org.logoFile', 'logoFile')
      .leftJoinAndSelect('org.bannerFile', 'bannerFile')
      .where('org.deletedAt IS NULL')
      .andWhere('org.isPublic = true')
      .andWhere('org.isActive = true')
      .andWhere('org.isVerified = true')
      .orderBy('org.employeeCount', 'DESC', 'NULLS LAST')
      .addOrderBy('org.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Advanced search with multiple filters
   */
  async advancedSearch(options: {
    searchTerm?: string;
    industryIds?: string[];
    country?: string;
    city?: string;
    organizationSize?: string[];
    organizationType?: string[];
    isHiring?: boolean;
    isVerified?: boolean;
    minEmployeeCount?: number;
    maxEmployeeCount?: number;
    workScheduleTypes?: string[];
  }): Promise<Organization[]> {
    const query = this.repository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.user', 'user')
      .leftJoinAndSelect('org.locations', 'locations')
      .leftJoinAndSelect('org.logoFile', 'logoFile')
      .leftJoinAndSelect('org.bannerFile', 'bannerFile')
      .leftJoinAndSelect('org.industry', 'industry')
      .where('org.deletedAt IS NULL')
      .andWhere('org.isPublic = true')
      .andWhere('org.isActive = true');

    // Text search
    if (options.searchTerm) {
      const search = `%${options.searchTerm}%`;
      query.andWhere(
        `(
            LOWER(org.name) LIKE LOWER(:search) OR
            LOWER(org.abbreviation) LIKE LOWER(:search) OR
            LOWER(org.shortDescription) LIKE LOWER(:search)
          )`,
        { search },
      );
    }

    // Industry filter - check if array exists and has elements
    if (
      options.industryIds &&
      Array.isArray(options.industryIds) &&
      options.industryIds.length > 0
    ) {
      query.andWhere('org.industryId IN (:...industryIds)', {
        industryIds: options.industryIds,
      });
    }

    // Location filters
    if (options.country) {
      query.andWhere('org.country = :country', { country: options.country });
    }
    if (options.city) {
      query.andWhere('org.city = :city', { city: options.city });
    }

    // Size filter - check if array exists and has elements
    if (
      options.organizationSize &&
      Array.isArray(options.organizationSize) &&
      options.organizationSize.length > 0
    ) {
      query.andWhere('org.organizationSize IN (:...sizes)', {
        sizes: options.organizationSize,
      });
    }

    // Type filter - check if array exists and has elements
    if (
      options.organizationType &&
      Array.isArray(options.organizationType) &&
      options.organizationType.length > 0
    ) {
      query.andWhere('org.organizationType IN (:...types)', {
        types: options.organizationType,
      });
    }

    // Hiring status
    if (options.isHiring !== undefined) {
      query.andWhere('org.isHiring = :isHiring', {
        isHiring: options.isHiring,
      });
    }

    // Verified status
    if (options.isVerified !== undefined) {
      query.andWhere('org.isVerified = :isVerified', {
        isVerified: options.isVerified,
      });
    }

    // Employee count range
    if (options.minEmployeeCount !== undefined) {
      query.andWhere('org.employeeCount >= :minEmployeeCount', {
        minEmployeeCount: options.minEmployeeCount,
      });
    }
    if (options.maxEmployeeCount !== undefined) {
      query.andWhere('org.employeeCount <= :maxEmployeeCount', {
        maxEmployeeCount: options.maxEmployeeCount,
      });
    }

    // Work schedule types - FIXED: Use proper array overlap syntax
    if (
      options.workScheduleTypes &&
      Array.isArray(options.workScheduleTypes) &&
      options.workScheduleTypes.length > 0
    ) {
      // Use ANY with array for PostgreSQL
      query.andWhere(
        'EXISTS (SELECT 1 FROM unnest(org.workScheduleTypes) AS schedule WHERE schedule = ANY(:schedules))',
        { schedules: options.workScheduleTypes },
      );
    }

    return query
      .orderBy('org.isVerified', 'DESC')
      .addOrderBy('org.employeeCount', 'DESC', 'NULLS LAST')
      .addOrderBy('org.createdAt', 'DESC')
      .limit(100)
      .getMany();
  }
}
