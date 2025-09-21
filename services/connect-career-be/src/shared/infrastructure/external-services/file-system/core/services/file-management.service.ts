import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import type {
  IFileSystemService,
  FileUploadResult,
  SignedUploadParams,
} from '../../infrastructure/interfaces/file-system.interface';
import { File, FileStatus, FileType } from '../../domain/entities/file.entity';
import type {
  IFileRepository,
  FileQueryOptions,
} from '../../domain/repositories/interfaces/file.repository.interface';
import { User } from 'src/modules/identity/domain/entities';
import { CurrentUserPayload } from 'src/modules/identity/api/decorators';

export interface FileUploadOptions {
  folder?: string;
  publicId?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  transformation?: Record<string, unknown>;
  tags?: string[];
  context?: Record<string, string>;
  description?: string;
  isPublic?: boolean;
  expiresAt?: Date;
}

@Injectable()
export class FileManagementService {
  constructor(
    @Inject('IFileSystemService')
    private fileSystemService: IFileSystemService,
    @Inject('IFileRepository')
    private fileRepository: IFileRepository,
  ) {}

  private determineFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return FileType.IMAGE;
    if (mimeType.startsWith('video/')) return FileType.VIDEO;
    if (mimeType.startsWith('audio/')) return FileType.AUDIO;
    if (
      mimeType.includes('pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('text')
    ) {
      return FileType.DOCUMENT;
    }
    return FileType.OTHER;
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxSize} bytes`,
      );
    }

    const allowedTypes = [
      'image/*',
      'video/*',
      'audio/*',
      'application/pdf',
      'text/*',
    ];
    if (
      !allowedTypes.some((type) => {
        if (type.endsWith('/*')) {
          return file.mimetype.startsWith(type.slice(0, -1));
        }
        return file.mimetype === type;
      })
    ) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed`,
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    options: FileUploadOptions,
    userId: string,
  ): Promise<File> {
    this.validateFile(file);
    // Create file record with uploading status
    const fileRecord = await this.fileRepository.create({
      originalName: file.originalname,
      fileName: file.filename || file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      status: FileStatus.UPLOADING,
      type: this.determineFileType(file.mimetype),
      folder: options.folder || 'uploads',
      description: options.description,
      isPublic: options.isPublic || false,
      expiresAt: options.expiresAt,
      uploadedById: userId,
      tags: options.tags || [],
      metadata: {
        ...options.context,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    try {
      const uploadParams: SignedUploadParams = {
        folder: options.folder || 'uploads',
        public_id: options.publicId || fileRecord.id,
        resource_type: options.resourceType || 'auto',
        transformation: options.transformation,
        tags: options.tags,
        context: {
          ...options.context,
          file_id: fileRecord.id,
          user_id: userId,
        },
      };

      const uploadResult: FileUploadResult =
        await this.fileSystemService.upload(file, uploadParams);

      // Update file record with upload results
      const updatedFile = await this.fileRepository.update(fileRecord.id, {
        publicId: uploadResult.publicId,
        url: uploadResult.url,
        secureUrl: uploadResult.secureUrl,
        width: uploadResult.width,
        height: uploadResult.height,
        status: FileStatus.UPLOADED,
        metadata: {
          ...fileRecord.metadata,
          format: uploadResult.format,
          resourceType: uploadResult.resourceType,
          bytes: uploadResult.bytes,
        },
      });

      return updatedFile!;
    } catch (error) {
      // Update file status to failed
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      await this.fileRepository.update(fileRecord.id, {
        status: FileStatus.FAILED,
        metadata: {
          ...fileRecord.metadata,
          error: errorMessage,
        },
      });
      throw error;
    }
  }

  async uploadFromUrl(
    url: string,
    options: FileUploadOptions,
    user: User,
  ): Promise<File> {
    // Create file record
    const fileRecord = await this.fileRepository.create({
      originalName: url.split('/').pop() || 'unknown',
      fileName: url.split('/').pop() || 'unknown',
      mimeType: 'application/octet-stream',
      fileSize: 0,
      status: FileStatus.UPLOADING,
      type: FileType.OTHER,
      folder: options.folder || 'uploads',
      description: options.description,
      isPublic: options.isPublic || false,
      expiresAt: options.expiresAt,
      uploadedBy: user,
      tags: options.tags || [],
      metadata: {
        ...options.context,
        sourceUrl: url,
        uploadedBy: user.email,
        uploadedAt: new Date().toISOString(),
      },
    });

    try {
      const uploadParams: SignedUploadParams = {
        folder: options.folder || 'uploads',
        public_id: options.publicId || fileRecord.id,
        resource_type: options.resourceType || 'auto',
        transformation: options.transformation,
        tags: options.tags,
        context: {
          ...options.context,
          file_id: fileRecord.id,
          user_id: user.id,
        },
      };

      const uploadResult: FileUploadResult =
        await this.fileSystemService.uploadFromUrl(url, uploadParams);

      // Update file record with upload results
      const updatedFile = await this.fileRepository.update(fileRecord.id, {
        publicId: uploadResult.publicId,
        url: uploadResult.url,
        secureUrl: uploadResult.secureUrl,
        width: uploadResult.width,
        height: uploadResult.height,
        status: FileStatus.UPLOADED,
        type: this.determineFileType(uploadResult.format),
        fileSize: uploadResult.bytes,
        metadata: {
          ...fileRecord.metadata,
          format: uploadResult.format,
          resourceType: uploadResult.resourceType,
          bytes: uploadResult.bytes,
        },
      });

      return updatedFile!;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      await this.fileRepository.update(fileRecord.id, {
        status: FileStatus.FAILED,
        metadata: {
          ...fileRecord.metadata,
          error: errorMessage,
        },
      });
      throw error;
    }
  }

  async generateSignedUploadUrl(
    options: FileUploadOptions,
    user: CurrentUserPayload,
  ): Promise<{
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    publicId: string;
    folder: string;
    resourceType: string;
    fileId: string;
  }> {
    if (!user?.sub) {
      throw new BadRequestException('Invalid user context');
    }
    const timestamp = Math.round(Date.now() / 1000);
    const randomId = Math.random().toString(36).substring(2, 11); // Use substring instead of substr
    const fileId = options.publicId || `file_${timestamp}_${randomId}`;

    const uploadParams: SignedUploadParams = {
      folder: options.folder || 'uploads',
      public_id: fileId,
      resource_type: options.resourceType || 'auto',
      transformation: options.transformation,
      tags: options.tags,
      context: {
        ...options.context,
        file_id: fileId,
        user_id: user.sub,
        uploaded_by: user.email,
      },
    };

    const signedUrl =
      this.fileSystemService.generateSignedUploadUrl(uploadParams);

    const fileRecord = await this.fileRepository.create({
      publicId: fileId,
      originalName: `pending_upload_${fileId}`,
      fileName: `pending_upload_${fileId}`,
      mimeType: 'application/octet-stream',
      fileSize: 0,
      status: FileStatus.UPLOADING,
      type: FileType.OTHER,
      folder: options.folder || 'uploads',
      description: options.description,
      isPublic: options.isPublic ?? false,
      expiresAt: options.expiresAt,
      uploadedById: user.sub,
      tags: options.tags || [],
      metadata: {
        ...options.context,
        uploadedBy: user.email,
        uploadedAt: new Date().toISOString(),
        isSignedUpload: true,
        signedUrlTimestamp: timestamp,
      },
    });

    return {
      ...signedUrl,
      fileId: fileRecord.id,
    };
  }

  async getFile(id: string, user: CurrentUserPayload): Promise<File> {
    const file = await this.fileRepository.findById(id);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.uploadedBy?.id !== user.sub && !file.isPublic) {
      throw new BadRequestException('Access denied');
    }

    return file;
  }

  async getFiles(
    options: FileQueryOptions,
    user: User,
  ): Promise<{ files: File[]; total: number }> {
    if (!options.uploadedBy) {
      const userFiles = await this.fileRepository.findByUser(user, options);
      const publicFiles = await this.fileRepository.findMany({
        ...options,
        isPublic: true,
        isDeleted: false,
      });

      return {
        files: [...userFiles.files, ...publicFiles.files],
        total: userFiles.total + publicFiles.total,
      };
    }

    return this.fileRepository.findMany(options);
  }

  async updateFile(
    id: string,
    updates: Partial<File>,
    user: CurrentUserPayload,
  ): Promise<File> {
    await this.getFile(id, user);
    const updatedFile = await this.fileRepository.update(id, updates);
    return updatedFile!;
  }

  async deleteFile(id: string, user: CurrentUserPayload): Promise<void> {
    const file = await this.getFile(id, user);

    await this.fileRepository.delete(id);

    try {
      await this.fileSystemService.delete(
        file.publicId,
        file.type as 'image' | 'video' | 'raw',
      );
    } catch (error) {
      console.error('Failed to delete file from cloud storage:', error);
    }
  }

  async generateAuthenticatedUrl(
    id: string,
    options: {
      transformation?: Record<string, unknown>;
      expiresAt?: number;
    },
    user: CurrentUserPayload,
  ): Promise<{ url: string }> {
    const file = await this.getFile(id, user);

    const url = this.fileSystemService.generateAuthenticatedUrl(file.publicId, {
      resourceType: file.type as 'image' | 'video' | 'raw' | 'auto',
      transformation: options.transformation,
      expiresAt: options.expiresAt,
    });

    return { url };
  }

  async getFileInfo(
    id: string,
    user: CurrentUserPayload,
  ): Promise<File & { cloudInfo?: Record<string, unknown> }> {
    const file = await this.getFile(id, user);

    try {
      const cloudInfo = await this.fileSystemService.getFileInfo(
        file.publicId,
        file.type as 'image' | 'video' | 'raw',
      );
      return {
        ...file,
        cloudInfo,
      };
    } catch {
      return file;
    }
  }
}
