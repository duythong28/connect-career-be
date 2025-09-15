import { Injectable } from '@nestjs/common';
import { File, FileStatus } from '../entities/file.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, FindManyOptions } from 'typeorm';
import {
  FileQueryOptions,
  IFileRepository,
} from './interfaces/file.repository.interface';
import { User } from 'src/modules/identity/domain/entities';

@Injectable()
export class FileRepository implements IFileRepository {
  constructor(
    @InjectRepository(File) private readonly fileRepository: Repository<File>,
  ) {}

  async findById(id: string): Promise<File | null> {
    return this.fileRepository.findOne({ where: { id } });
  }

  async findByPublicId(publicId: string): Promise<File | null> {
    return this.fileRepository.findOne({ where: { publicId } });
  }

  async findMany(
    options: FileQueryOptions = {},
  ): Promise<{ files: File[]; total: number }> {
    const where: FindOptionsWhere<File> = {};

    if (options.uploadedBy) where.uploadedById = options.uploadedBy;
    if (options.status) where.status = options.status;
    if (options.type) where.type = options.type;
    if (options.folder) where.folder = options.folder;
    if (options.isPublic !== undefined) where.isPublic = options.isPublic;
    if (options.isDeleted !== undefined) where.isDeleted = options.isDeleted;

    const findOptions: FindManyOptions<File> = {
      where,
      order: { createdAt: 'DESC' },
    };

    if (options.limit) findOptions.take = options.limit;
    if (options.offset) findOptions.skip = options.offset;

    if (options.tags && options.tags.length > 0) {
      findOptions.where = {
        ...where,
        tags: { $overlap: options.tags } as any,
      };
    }

    const [files, total] = await this.fileRepository.findAndCount(findOptions);
    return { files, total };
  }

  async create(file: Partial<File>): Promise<File> {
    const newFile = this.fileRepository.create(file);
    return this.fileRepository.save(newFile);
  }

  async update(id: string, updates: Partial<File>): Promise<File | null> {
    await this.fileRepository.update(id, updates);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.fileRepository.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
      status: FileStatus.DELETED,
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.fileRepository.delete(id);
  }

  async findByUser(
    user: User,
    options: Omit<FileQueryOptions, 'uploadedBy'> = {},
  ): Promise<{ files: File[]; total: number }> {
    return this.findMany({ ...options, uploadedBy: user.id });
  }

  async findByFolder(
    folder: string,
    options: Omit<FileQueryOptions, 'folder'> = {},
  ): Promise<{ files: File[]; total: number }> {
    return this.findMany({ ...options, folder });
  }

  async findByTags(
    tags: string[],
    options: Omit<FileQueryOptions, 'tags'> = {},
  ): Promise<{ files: File[]; total: number }> {
    return this.findMany({ ...options, tags });
  }
}
