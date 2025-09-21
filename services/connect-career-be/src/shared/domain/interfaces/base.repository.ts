import { Injectable } from '@nestjs/common';
import {
  DeepPartial,
  FindManyOptions,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';

export interface QueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export abstract class BaseRepository<T extends ObjectLiteral> {
  constructor(protected readonly repository: Repository<T>) {}
  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
    });
  }

  async findByIds(ids: string[]): Promise<T[]> {
    return (this.repository, this.findByIds(ids));
  }

  async findAll(): Promise<T[]> {
    return this.repository.find();
  }

  async create(entity: DeepPartial<T>): Promise<T> {
    const newEntity = this.repository.create(entity);
    return this.repository.save(newEntity);
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    await this.repository.update(id, updates as any);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (
      result.affected !== undefined &&
      result.affected !== null &&
      result.affected > 0
    );
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id);
    return (
      result.affected !== undefined &&
      result.affected !== null &&
      result.affected > 0
    );
  }

  async findPaginated(
    options: QueryOptions = {},
    whereConditions: FindOptionsWhere<T> = {},
    relations: string[] = [],
  ): Promise<PaginatedResult<T>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;
    const skip = (page - 1) * limit;

    const findOptions: FindManyOptions<T> = {
      where: whereConditions,
      relations,
      skip,
      take: limit,
      order: { [sortBy]: sortOrder } as any,
    };

    const [data, total] = await this.repository.findAndCount(findOptions);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findWithConditions(
    whereConditions: FindOptionsWhere<T>,
    relations: string[] = [],
  ): Promise<T[]> {
    return this.repository.find({ where: whereConditions, relations });
  }

  async count(whereConditions: FindOptionsWhere<T>): Promise<number> {
    return this.repository.count({ where: whereConditions });
  }

  async exists(whereConditions: FindOptionsWhere<T>): Promise<boolean> {
    const count = await this.repository.count({ where: whereConditions });
    return count > 0;
  }
}
