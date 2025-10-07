import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import fetch from 'node-fetch';
import { AIService } from './ai.service';
import {
  parseResumeTextToCVContent,
  parseResume,
} from './utils/resume-parser.util';
import { RESUME_EXTRACTION_PROMPT } from './prompts/resume_extraction_prompt';

type ExtractPdfDto = {
  url: string;
  prompt?: string;
  model?: string;
  location?: string;
  projectId?: string;
  responseMimeType?: string;
  temperature?: number;
};

type ParseResumeDto = {
  text: string;
};

type ParseResumeFromPdfDto = {
  url: string;
  prompt?: string;
  temperature?: number;
};

@Controller('v1/ai')
export class AIController {
  constructor(private readonly ai: AIService) {}
  @Post('cv/parse-resume-text')
  parseResumeText(@Body() body: ParseResumeDto) {
    if (!body?.text) throw new BadRequestException('text is required');

    try {
      const fullParsed = parseResume(body.text);

      const cvContent = parseResumeTextToCVContent(body.text);

      return {
        success: true,
        data: {
          cvContent,
          fullParsed,
        },
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BadRequestException(`Parse failed: ${message}`);
    }
  }

  @Post('cv/parse-resume-from-pdf')
  async parseResumeFromPdf(@Body() body: ParseResumeFromPdfDto) {
    if (!body?.url) throw new BadRequestException('url is required');

    try {
      // Step 1: Extract text from PDF
      const res = await fetch(body.url);
      if (!res.ok)
        throw new BadRequestException(
          `Download failed: ${res.status} ${res.statusText}`,
        );
      const buf = Buffer.from(await res.arrayBuffer());
      const base64 = buf.toString('base64');

      const extractResult = await this.ai.generateWithInlineFile({
        prompt: RESUME_EXTRACTION_PROMPT,
        inline: { dataBase64: base64, mimeType: 'application/pdf' },
        temperature: body.temperature ?? 0,
      });

      const extractedText = String(extractResult.content || '');

      const fullParsed = parseResume(extractedText);
      const cvContent = parseResumeTextToCVContent(extractedText);

      return {
        success: true,
        data: {
          extractedText,
          cvContent,
          fullParsed,
        },
        metadata: {
          promptOptimized: true,
          parserVersion: '1.0.0',
        },
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BadRequestException(`Parse failed: ${message}`);
    }
  }
}
