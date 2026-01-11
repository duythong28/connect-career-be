import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { MediaType } from '../apis/dtos/media-attachment.dto';

export interface MediaProcessingResult {
  success: boolean;
  extractedText?: string;
  analysis?: any;
  metadata?: Record<string, any>;
  error?: string;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private readonly aiService: AIService) {}

  async processMedia(
    content: string,
    type: string,
    fileName: string,
    options?: {
      userId?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<MediaProcessingResult> {
    try {
      const mediaType = this.mapStringToMediaType(type);
      switch (mediaType) {
        case MediaType.DOCUMENT:
          return await this.processDocument(content, fileName, options);
        case MediaType.IMAGE:
          return await this.processImage(content, fileName, options);
        default:
          return {
            success: false,
            error: `Media type ${type} not yet supported`,
          };
      }
    } catch (error) {
      this.logger.error(
        `Media processing failed: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async processMediaFromUrl(
    url: string,
    type: string,
    fileName: string,
    options?: {
      userId?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<MediaProcessingResult> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const base64Content = Buffer.from(response.data).toString('base64');

      return await this.processMedia(base64Content, type, fileName, options);
    } catch (error) {
      this.logger.error(`Failed to fetch media from URL: ${url}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private mapStringToMediaType(type: string): MediaType {
    switch (type.toLowerCase()) {
      case 'image':
        return MediaType.IMAGE;
      case 'document':
        return MediaType.DOCUMENT;
      case 'video':
        return MediaType.VIDEO;
      case 'audio':
        return MediaType.AUDIO;
      default:
        return MediaType.DOCUMENT;
    }
  }

  private async processDocument(
    content: string,
    fileName: string,
    options?: {
      userId?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<MediaProcessingResult> {
    // Extract text from document using AI service
    try {
      // Determine MIME type from file extension
      const mimeType = this.getMimeTypeFromFileName(fileName);

      const response = (await this.aiService.generateWithInlineFile({
        prompt:
          'Extract all text content from this document. Return the text in a structured format.',
        inline: {
          dataBase64: content,
          mimeType,
        },
        temperature: 0.1,
        maxOutputTokens: 4096,
      })) as { content: string; raw?: unknown };

      return {
        success: true,
        extractedText: response.content,
        metadata: {
          fileName,
          mimeType,
          ...options?.metadata,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async processImage(
    content: string,
    fileName: string,
    options?: {
      userId?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<MediaProcessingResult> {
    // Analyze image using AI service
    try {
      const mimeType = this.getMimeTypeFromFileName(fileName) || 'image/jpeg';

      const response = (await this.aiService.generateWithInlineFile({
        prompt:
          'Analyze this image and describe its content. If it contains text, extract it. If it appears to be a document (CV, resume, certificate), provide a structured analysis.',
        inline: {
          dataBase64: content,
          mimeType,
        },
        temperature: 0.3,
        maxOutputTokens: 2048,
      })) as { content: string; raw?: unknown };

      return {
        success: true,
        extractedText: response.content,
        analysis: {
          type: 'image_analysis',
          description: response.content,
        },
        metadata: {
          fileName,
          mimeType,
          ...options?.metadata,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private getMimeTypeFromFileName(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
    };
    return mimeTypes[extension || ''] || 'application/octet-stream';
  }
}
