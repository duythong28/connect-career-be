import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IFileSystemService,
  FileUploadResult,
  SignedUploadParams,
} from '../interfaces/file-system.interface';
import { v2 as cloudinary } from 'cloudinary';

interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  format: string;
  resource_type: string;
  bytes: number;
}

interface CloudinaryUploadOptions {
  folder?: string;
  public_id?: string;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  transformation?: Record<string, unknown> | string;
  tags?: string[];
  context?: Record<string, unknown>;
}

@Injectable()
export class CloudinaryProvider implements IFileSystemService {
  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Missing required Cloudinary configuration');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  async upload(
    file: Express.Multer.File,
    params: SignedUploadParams = {},
  ): Promise<FileUploadResult> {
    try {
      const uploadResult = await new Promise<FileUploadResult>(
        (resolve, reject) => {
          const uploadOptions: CloudinaryUploadOptions = {
            folder: params.folder || 'uploads',
            public_id: params.public_id,
            resource_type: params.resource_type || 'auto',
            transformation: params.transformation as
              | Record<string, unknown>
              | string
              | undefined,
            tags: params.tags,
            context: params.context,
          };

          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) {
                reject(new Error(error.message || 'Upload failed'));
              } else if (result) {
                const cloudinaryResult = result as CloudinaryUploadResult;
                resolve({
                  publicId: cloudinaryResult.public_id,
                  url: cloudinaryResult.secure_url,
                  secureUrl: cloudinaryResult.secure_url,
                  width: cloudinaryResult.width,
                  height: cloudinaryResult.height,
                  format: cloudinaryResult.format,
                  resourceType: cloudinaryResult.resource_type,
                  bytes: cloudinaryResult.bytes,
                });
              } else {
                reject(new Error('Upload failed: No result returned'));
              }
            },
          );

          uploadStream.end(file.buffer);
        },
      );

      return uploadResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BadRequestException(`Failed to upload file: ${errorMessage}`);
    }
  }

  async uploadFromUrl(
    url: string,
    params: SignedUploadParams = {},
  ): Promise<FileUploadResult> {
    try {
      const uploadOptions: CloudinaryUploadOptions = {
        folder: params.folder || 'uploads',
        public_id: params.public_id,
        resource_type: params.resource_type || 'auto',
        transformation: params.transformation as
          | Record<string, unknown>
          | string
          | undefined,
        tags: params.tags,
        context: params.context,
      };

      const result = (await cloudinary.uploader.upload(
        url,
        uploadOptions,
      )) as CloudinaryUploadResult;

      return {
        publicId: result.public_id,
        url: result.secure_url,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BadRequestException(
        `Failed to upload from URL: ${errorMessage}`,
      );
    }
  }

  async delete(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BadRequestException(`Failed to delete file: ${errorMessage}`);
    }
  }

  generateSignedUploadUrl(params: SignedUploadParams = {}): {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    publicId: string;
    folder: string;
    resourceType: string;
  } {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const publicId =
      params.public_id ||
      `file_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    const folder = params.folder || 'uploads';
    const resourceType = params.resource_type || 'auto';

    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');

    if (!apiSecret || !cloudName || !apiKey) {
      throw new Error(
        'Missing required Cloudinary configuration for signed upload',
      );
    }

    const signatureParams: Record<string, any> = {
      folder,
      public_id: publicId,
      timestamp,
    };
    const signature = cloudinary.utils.api_sign_request(
      signatureParams,
      apiSecret,
    );

    return {
      signature,
      timestamp,
      cloudName,
      apiKey,
      publicId,
      folder,
      resourceType,
    };
  }

  generateAuthenticatedUrl(
    publicId: string,
    options: {
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
      transformation?: Record<string, unknown>;
      expiresAt?: number;
    } = {},
  ): string {
    const { resourceType = 'auto', transformation, expiresAt } = options;

    const url = cloudinary.url(publicId, {
      resource_type: resourceType,
      transformation: transformation,
      sign_url: true,
      expires_at: expiresAt,
    });

    return url;
  }

  async getFileInfo(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<Record<string, unknown>> {
    try {
      const result = (await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      })) as Record<string, unknown>;
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BadRequestException(`Failed to get file info: ${errorMessage}`);
    }
  }
}
