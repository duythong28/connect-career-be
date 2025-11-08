import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CVRepository } from '../../domain/repository/cv.repository';
import { FileManagementService } from 'src/shared/infrastructure/external-services/file-system/core/services/file-management.service';
import { UploadCVDto } from '../dtos/cv.create.dto';
import {
  CV,
  CVSource,
  CVStatus,
  ParsingStatus,
} from '../../domain/entities/cv.entity';
import { CurrentUserPayload } from 'src/modules/identity/api/decorators';
import { PaginatedResult } from 'src/shared/domain/interfaces/base.repository';
import { UpdateCVDto } from '../dtos/cv.create-from-template.dto';

@Injectable()
export class CVService {
  constructor(
    private readonly cvRepository: CVRepository,
    private readonly fileManagementService: FileManagementService,
  ) {}

  async uploadCV(
    uploadCVDto: UploadCVDto,
    user: CurrentUserPayload,
  ): Promise<CV> {
    const file = await this.fileManagementService.getFile(
      uploadCVDto.fileId,
      user,
    );
    if (!file) {
      throw new NotFoundException('File not found');
    }
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
    ];

    if (!allowedMimeTypes.includes(file.mimeType)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, Word documents, RTF, and plain text files are allowed for CV upload.',
      );
    }
    const cvData = {
      title: uploadCVDto.title,
      description: uploadCVDto.description,
      type: uploadCVDto.type,
      fileName: file.fileName,
      fileId: uploadCVDto.fileId,
      userId: user.sub,
      status: CVStatus.DRAFT,
      source: CVSource.UPLOADED,
      parsingStatus: ParsingStatus.PENDING,
      isPublic: uploadCVDto.isPublic || false,
      isTemplate: uploadCVDto.isTemplate || false,
      tags: uploadCVDto.tags || [],
      metadata: {
        ...uploadCVDto.metadata,
        uploadedAt: new Date(),
        originalFileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
      },
    };

    // Save CV to database
    const savedCV = await this.cvRepository.create(cvData);
    return savedCV;
  }

  async getCVsByCandidateId(candidateId: string): Promise<PaginatedResult<CV>> {
    return this.cvRepository.findUserCVs(candidateId);
  }

  async getCVById(id: string, user: CurrentUserPayload): Promise<CV> {
    const cv = await this.cvRepository.findByIdAndUserId(id, user.sub);
    if (!cv) {
      throw new NotFoundException(`CV with ID ${id} not found.`);
    }
    return cv;
  }

  async updateCV(
    id: string,
    updateCVDto: UpdateCVDto,
    user: CurrentUserPayload,
  ): Promise<CV> {
    const existingCV = await this.cvRepository.findByIdAndUserId(id, user.sub);
    if (!existingCV) {
      throw new NotFoundException(
        `CV with ID ${id} not found or access denied`,
      );
    }
    const updateData: Partial<CV> = {};

    if (updateCVDto.title !== undefined) updateData.title = updateCVDto.title;
    if (updateCVDto.description !== undefined)
      updateData.description = updateCVDto.description;
    if (updateCVDto.status !== undefined)
      updateData.status = updateCVDto.status;
    if (updateCVDto.isPublic !== undefined)
      updateData.isPublic = updateCVDto.isPublic;
    if (updateCVDto.tags !== undefined) updateData.tags = updateCVDto.tags;
    if (updateCVDto.content !== undefined)
      updateData.content = updateCVDto.content as unknown as {
        [key: string]: any;
      };
    console.log(updateCVDto.content);
    if (updateCVDto.builderData !== undefined)
      updateData.builderData = updateCVDto.builderData;

    if (updateCVDto.metadata !== undefined) {
      updateData.metadata = {
        ...existingCV.metadata,
        ...updateCVDto.metadata,
        updatedAt: new Date(),
      };
    }
    const updatedCV = await this.cvRepository.update(id, updateData);
    if (!updatedCV) {
      throw new NotFoundException(`Failed to update CV with ID ${id}`);
    }
    return updatedCV;
  }

  async deleteCV(id: string, user: CurrentUserPayload): Promise<void> {
    const cv = await this.getCVById(id, user);
    await this.cvRepository.softDelete(id);
    if (cv.fileId) {
      await this.fileManagementService.deleteFile(cv.fileId, user);
    }
  }

  async downloadCV(
    id: string,
    user: CurrentUserPayload,
  ): Promise<{ url: string; filename: string }> {
    const cv = await this.getCVById(id, user);
    const file = await this.fileManagementService.getFile(cv.fileId!, user);
    if (!file) {
      throw new BadRequestException('No file associated with this CV');
    }
    let downloadUrl: string;
    if (file.isPublic) {
      downloadUrl = file.secureUrl!;
    } else {
      const result = await this.fileManagementService.generateAuthenticatedUrl(
        cv.fileId!,
        { expiresAt: Date.now() + 3600 * 1000 },
        user,
      );
      downloadUrl = result.url;
    }
    return {
      url: downloadUrl,
      filename: cv.fileName || `${cv.title}.${cv.type}`,
    };
  }
  async publishCV(
    id: string,
    isPublic: boolean,
    user: CurrentUserPayload,
  ): Promise<CV> {
    return this.updateCV(id, { isPublic }, user);
  }
}
