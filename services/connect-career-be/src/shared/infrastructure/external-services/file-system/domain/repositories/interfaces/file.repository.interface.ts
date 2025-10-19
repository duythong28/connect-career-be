import { User } from 'src/modules/identity/domain/entities';
import { File, FileStatus, FileType } from '../../entities/file.entity';

export interface FileQueryOptions {
  uploadedBy?: string;
  status?: FileStatus;
  type?: FileType;
  folder?: string;
  tags?: string[];
  isPublic?: boolean;
  isDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface IFileRepository {
  findById(id: string): Promise<File | null>;
  findByPublicId(publicId: string): Promise<File | null>;
  findMany(
    options: FileQueryOptions,
  ): Promise<{ files: File[]; total: number }>;
  create(file: Partial<File>): Promise<File>;
  update(id: string, updates: Partial<File>): Promise<File | null>;
  delete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  findByUser(
    user: User,
    options?: Omit<FileQueryOptions, 'uploadedBy'>,
  ): Promise<{ files: File[]; total: number }>;
  findByFolder(
    folder: string,
    options?: Omit<FileQueryOptions, 'folder'>,
  ): Promise<{ files: File[]; total: number }>;
  findByTags(
    tags: string[],
    options?: Omit<FileQueryOptions, 'tags'>,
  ): Promise<{ files: File[]; total: number }>;
}
