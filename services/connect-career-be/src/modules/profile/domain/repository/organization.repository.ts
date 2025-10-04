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
    throw new Error('Method not implemented.');
  }
  findHiring(): Promise<Organization[]> {
    throw new Error('Method not implemented.');
  }
  findVerified(): Promise<Organization[]> {
    throw new Error('Method not implemented.');
  }
}
