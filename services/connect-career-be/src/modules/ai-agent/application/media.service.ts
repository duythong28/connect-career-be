import { Injectable, Logger } from '@nestjs/common';
import { MediaType } from '../apis/dtos/media-upload.dto';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';

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
    content: string, // Base64 encoded
    type: MediaType,
    fileName: string,
    options?: {
      userId?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<MediaProcessingResult> {
    try {
      switch (type) {
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

      const response = await this.aiService.generateWithInlineFile({
        prompt: 'Extract all text content from this document. Return the text in a structured format.',
        inline: {
          dataBase64: content,
          mimeType,
        },
        temperature: 0.1,
        maxOutputTokens: 4096,
      });

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

      const response = await this.aiService.generateWithInlineFile({
        prompt: 'Analyze this image and describe its content. If it contains text, extract it. If it appears to be a document (CV, resume, certificate), provide a structured analysis.',
        inline: {
          dataBase64: content,
          mimeType,
        },
        temperature: 0.3,
        maxOutputTokens: 2048,
      });

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

