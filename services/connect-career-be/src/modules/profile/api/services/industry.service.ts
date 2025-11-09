import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Industry } from '../../domain/entities/industry.entity';
import { IndustryQueryDto } from '../dtos/industry-query.dto';
import {
  CreateIndustryDto,
  UpdateIndustryDto,
} from '../dtos/industry.crud.dto';

@Injectable()
export class IndustryService {
  constructor(
    @InjectRepository(Industry)
    private readonly industryRepository: Repository<Industry>,
  ) {}

  async getAllIndustries(query: IndustryQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      parentId,
      parentsOnly = false,
      isActive = true,
      sortBy = 'sortOrder',
      sortOrder = 'ASC',
    } = query;

    const skip = (page - 1) * limit;

    let queryBuilder = this.industryRepository
      .createQueryBuilder('industry')
      .leftJoinAndSelect('industry.parent', 'parent')
      .leftJoinAndSelect('industry.children', 'children')
      .where('industry.isActive = :isActive', { isActive });

    if (parentsOnly) {
      queryBuilder = queryBuilder.andWhere('industry.parentId IS NULL');
    } else if (parentId !== undefined) {
      queryBuilder = queryBuilder.andWhere('industry.parentId = :parentId', {
        parentId,
      });
    }

    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(industry.name ILIKE :search OR industry.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder = queryBuilder
      .orderBy(`industry.${sortBy}`, sortOrder)
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getIndustryById(id: string): Promise<Industry> {
    const industry = await this.industryRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!industry) {
      throw new NotFoundException('Industry not found');
    }

    return industry;
  }

  async getParentIndustries(): Promise<Industry[]> {
    return this.industryRepository.find({
      where: { parentId: undefined, isActive: true },
      relations: ['children'],
      order: { sortOrder: 'ASC' },
    });
  }

  async getChildIndustries(parentId: string): Promise<Industry[]> {
    return this.industryRepository.find({
      where: { parentId, isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async getIndustriesTree(): Promise<Industry[]> {
    const parents = await this.industryRepository.find({
      where: { parentId: undefined, isActive: true },
      relations: ['children'],
      order: { sortOrder: 'ASC' },
    });

    // Load children for each parent
    for (const parent of parents) {
      parent.children = await this.industryRepository.find({
        where: { parentId: parent.id, isActive: true },
        order: { sortOrder: 'ASC' },
      });
    }

    return parents;
  }
  async createIndustry(dto: CreateIndustryDto): Promise<Industry> {
    // Validate parent exists if parentId is provided
    if (dto.parentId) {
      const parent = await this.industryRepository.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent industry not found');
      }
    }

    // Check for duplicate name at the same level
    const existingIndustry = await this.industryRepository.findOne({
      where: {
        name: dto.name,
        parentId: dto.parentId || undefined,
      },
    });

    if (existingIndustry) {
      throw new BadRequestException(
        'Industry with this name already exists at this level',
      );
    }

    const industry = this.industryRepository.create({
      name: dto.name,
      description: dto.description,
      sortOrder: dto.sortOrder ?? 0,
      parentId: dto.parentId,
      isActive: dto.isActive ?? true,
      keywords: dto.keywords ?? [],
    });

    return this.industryRepository.save(industry);
  }

  async updateIndustry(id: string, dto: UpdateIndustryDto): Promise<Industry> {
    const industry = await this.industryRepository.findOne({
      where: { id },
    });

    if (!industry) {
      throw new NotFoundException('Industry not found');
    }

    // Validate parent exists if parentId is being updated
    if (dto.parentId !== undefined && dto.parentId !== industry.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Industry cannot be its own parent');
      }

      if (dto.parentId) {
        const parent = await this.industryRepository.findOne({
          where: { id: dto.parentId },
        });
        if (!parent) {
          throw new NotFoundException('Parent industry not found');
        }

        // Prevent circular reference: check if the new parent is a descendant
        const isDescendant = await this.isDescendant(dto.parentId, id);
        if (isDescendant) {
          throw new BadRequestException(
            'Cannot set parent: would create circular reference',
          );
        }
      }
    }

    // Check for duplicate name if name is being updated
    if (dto.name && dto.name !== industry.name) {
      const existingIndustry = await this.industryRepository.findOne({
        where: {
          name: dto.name,
          parentId: dto.parentId ?? industry.parentId ?? undefined,
        },
      });

      if (existingIndustry && existingIndustry.id !== id) {
        throw new BadRequestException(
          'Industry with this name already exists at this level',
        );
      }
    }

    // Update fields
    Object.assign(industry, dto);
    return this.industryRepository.save(industry);
  }

  private async isDescendant(
    ancestorId: string,
    descendantId: string,
  ): Promise<boolean> {
    const descendant = await this.industryRepository.findOne({
      where: { id: descendantId },
      relations: ['parent'],
    });

    if (!descendant || !descendant.parentId) {
      return false;
    }

    if (descendant.parentId === ancestorId) {
      return true;
    }

    return this.isDescendant(ancestorId, descendant.parentId);
  }
}
