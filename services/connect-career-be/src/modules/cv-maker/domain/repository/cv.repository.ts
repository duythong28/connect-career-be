import {
  BaseRepository,
  PaginatedResult,
  QueryOptions,
} from 'src/shared/domain/interfaces/base.repository';
import { CV, CVSource, CVStatus, CVType } from '../entities/cv.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Like, Repository } from 'typeorm';

export interface CVQueryOptions extends QueryOptions {
  userId?: string;
  status?: CVStatus;
  type?: CVType;
  source?: CVSource;
  tags?: string[];
  isPublic?: boolean;
  isTemplate?: boolean;
}

@Injectable()
export class CVRepository extends BaseRepository<CV> {
  constructor(
    @InjectRepository(CV)
    repository: Repository<CV>,
  ) {
    super(repository);
  }
  async findByIdAndUserId(id: string, userId: string): Promise<CV | null> {
    return this.repository.findOne({
      where: { id, userId, deletedAt: IsNull() },
      relations: ['file', 'user'],
    });
  }
  async findUserCVs(
    userId: string,
    options: CVQueryOptions = {},
  ): Promise<PaginatedResult<CV>> {
    const whereConditions = this.buildWhereClause({ ...options, userId });
    return this.findPaginated(options, whereConditions, ['user', 'file']);
  }

  async findTemplates(
    options: CVQueryOptions = {},
  ): Promise<PaginatedResult<CV>> {
    const whereConditions = this.buildWhereClause({
      ...options,
      isTemplate: true,
      isPublic: true,
    });
    return this.findPaginated(options, whereConditions, ['user']);
  }

  async findPublicCVs(
    options: CVQueryOptions = {},
  ): Promise<PaginatedResult<CV>> {
    const whereConditions = this.buildWhereClause({
      ...options,
      isPublic: true,
      isTemplate: false,
    });
    return this.findPaginated(options, whereConditions, ['user']);
  }

  async findByUserId(userId: string): Promise<CV[]> {
    return this.findWithConditions(
      { userId, deletedAt: IsNull() } as FindOptionsWhere<CV>,
      ['user', 'file'],
    );
  }
  private buildWhereClause(filters: CVQueryOptions): FindOptionsWhere<CV> {
    const where: FindOptionsWhere<CV> = {
      deletedAt: IsNull(),
    };

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.source) {
      (where as any).source = filters.source;
    }

    if (filters.isPublic !== undefined) {
      (where as any).isPublic = filters.isPublic;
    }

    if (filters.isTemplate !== undefined) {
      (where as any).isTemplate = filters.isTemplate;
    }

    if (filters.search) {
      (where as any).title = Like(`%${filters.search}%`);
    }
    return where;
  }
}
