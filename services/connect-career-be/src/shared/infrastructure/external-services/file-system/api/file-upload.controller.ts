import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import * as fileManagementService from '../core/services/file-management.service';
import * as decorators from 'src/modules/identity/api/decorators';
import { User } from 'src/modules/identity/domain/entities';
import * as fileRepositoryInterface from '../domain/repositories/interfaces/file.repository.interface';
import type { Express } from 'express';

export class SignedUploadUrlDto {
  folder?: string;
  publicId?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  transformation?: any;
  tags?: string[];
  context?: Record<string, string>;
  description?: string;
  isPublic?: boolean;
  expiresAt?: Date;
}

export class AuthenticatedUrlDto {
  transformation?: any;
  expiresAt?: number;
}

export class FileUpdateDto {
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  expiresAt?: Date;
}

@ApiTags('File Management')
@Controller('v1/files')
export class FileUploadController {
  constructor(
    private fileManagementService: fileManagementService.FileManagementService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload file to cloud storage and database' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: { type: 'string' },
        publicId: { type: 'string' },
        resourceType: {
          type: 'string',
          enum: ['image', 'video', 'raw', 'auto'],
        },
        tags: { type: 'array', items: { type: 'string' } },
        description: { type: 'string' },
        isPublic: { type: 'boolean' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() options: fileManagementService.FileUploadOptions,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.fileManagementService.uploadFile(file, options, user.sub);
  }

  @Post('upload-from-url')
  @ApiOperation({
    summary: 'Upload file from URL to cloud storage and database',
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadFromUrl(
    @Body() body: { url: string } & fileManagementService.FileUploadOptions,
    @decorators.CurrentUser() user: User,
  ) {
    const { url, ...options } = body;
    return this.fileManagementService.uploadFromUrl(url, options, user);
  }

  @Post('signed-upload-url')
  @ApiOperation({
    summary: 'Generate signed upload URL for client-side uploads',
  })
  @ApiResponse({
    status: 201,
    description: 'Signed upload URL generated successfully',
  })
  generateSignedUploadUrl(
    @Body() dto: SignedUploadUrlDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.fileManagementService.generateSignedUploadUrl(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file information' })
  @ApiResponse({
    status: 200,
    description: 'File information retrieved successfully',
  })
  async getFile(
    @Param('id') id: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.fileManagementService.getFile(id, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get files with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
  async getFiles(
    @Query() query: fileRepositoryInterface.FileQueryOptions,
    @decorators.CurrentUser() user: User,
  ) {
    return this.fileManagementService.getFiles(query, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update file metadata' })
  @ApiResponse({ status: 200, description: 'File updated successfully' })
  async updateFile(
    @Param('id') id: string,
    @Body() updates: FileUpdateDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.fileManagementService.updateFile(id, updates, user);
  }

  @Post(':id/authenticated-url')
  @ApiOperation({ summary: 'Generate authenticated URL for private resources' })
  @ApiResponse({
    status: 201,
    description: 'Authenticated URL generated successfully',
  })
  async generateAuthenticatedUrl(
    @Param('id') id: string,
    @Body() dto: AuthenticatedUrlDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.fileManagementService.generateAuthenticatedUrl(id, dto, user);
  }

  @Get(':id/info')
  @ApiOperation({
    summary: 'Get detailed file information including cloud metadata',
  })
  @ApiResponse({
    status: 200,
    description: 'File information retrieved successfully',
  })
  async getFileInfo(
    @Param('id') id: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.fileManagementService.getFileInfo(id, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete file from cloud storage and database' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async deleteFile(
    @Param('id') id: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    await this.fileManagementService.deleteFile(id, user);
    return { message: 'File deleted successfully' };
  }
}
