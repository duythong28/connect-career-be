import { Body, Controller, Post, BadRequestException, NotFoundException, UseGuards, UseInterceptors } from '@nestjs/common';
import fetch from 'node-fetch';
import {
  parseResumeTextToCVContent,
  parseResume,
} from './utils/resume-parser.util';
import {
  ENHANCE_RESUME_EXTRACTION_PROMPT,
  RESUME_EXTRACTION_PROMPT,
} from './prompts/resume_extraction_prompt';
import * as aiJobDescriptionService from './services/ai-job-description.service';
import { AIService } from './services/ai.service';
import * as aiCvEnhancementService from './services/ai-cv-enhancement.service';
import { InjectRepository } from '@nestjs/typeorm';
import { CV, ParsingStatus } from 'src/modules/cv-maker/domain/entities/cv.entity';
import { File } from '../file-system/domain/entities/file.entity';
import { FindOptions, Repository } from 'typeorm';
import { WalletDeductionInterceptor } from 'src/modules/subscription/api/interceptors/wallet-deduction.interceptor';
import { WalletBalanceGuard } from 'src/modules/subscription/api/guards/wallet-balance.guard';
import { RequireWalletBalance } from 'src/modules/subscription/api/decorators/wallet-balance.decorator';

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
  constructor(
    private readonly ai: AIService,
    private readonly aiJobDescriptionService: aiJobDescriptionService.AIJobDescriptionService,
    private readonly aiCvEnhancementService: aiCvEnhancementService.AICVEnhancementService,
    @InjectRepository(CV)
    private readonly cvRepository: Repository<CV>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,  
  ) {}
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
        prompt: ENHANCE_RESUME_EXTRACTION_PROMPT,
        inline: { dataBase64: base64, mimeType: 'application/pdf' },
        temperature: body.temperature ?? 0,
      });

      const extractedText =
        this.extractJsonFromMarkdown(String(extractResult.content || '')) || '';

      return {
        success: true,
        data: {
          extractedText,
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

  @Post('job-description/generate')
  async generateJobDescription(
    @Body() body: aiJobDescriptionService.JobDescriptionPrompt,
  ) {
    if (!body?.title) throw new BadRequestException('title is required');
    if (!body?.companyName)
      throw new BadRequestException('companyName is required');
    if (!body?.location) throw new BadRequestException('location is required');

    try {
      const result =
        await this.aiJobDescriptionService.generateJobDescription(body);

      return {
        success: true,
        data: result,
        metadata: {
          modelId: body.modelId,
          temperature: body.temperature ?? 0.7,
          promptOptimized: true,
        },
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BadRequestException(
        `Job description generation failed: ${message}`,
      );
    }
  }

  @Post('job-description/refine')
  async refineJobDescription(
    @Body() body: aiJobDescriptionService.RefinementPrompt,
  ) {
    if (!body?.currentDescription)
      throw new BadRequestException('currentDescription is required');
    if (!body?.feedback) throw new BadRequestException('feedback is required');

    try {
      const result =
        await this.aiJobDescriptionService.refineJobDescription(body);

      return {
        success: true,
        data: result,
        metadata: {
          modelId: body.modelId,
          temperature: body.temperature ?? 0.5,
          refinement: true,
        },
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BadRequestException(
        `Job description refinement failed: ${message}`,
      );
    }
  }

  @Post('cv/enhance')
  @UseGuards(WalletBalanceGuard)
  @UseInterceptors(WalletDeductionInterceptor)
  @RequireWalletBalance('AI_CV_ENHANCEMENT')
  async enhanceCV(@Body() body: aiCvEnhancementService.CVEnhancementPrompt) {
    if (!body?.cv) {
      throw new BadRequestException('cv is required');
    }

    try {
      const result = await this.aiCvEnhancementService.enhanceCV(body);

      return {
        success: true,
        data: result,
        metadata: {
          modelId: 'gemini-2.5-pro',
          temperature: body.temperature ?? 0.3,
        },
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BadRequestException(`CV enhancement failed: ${message}`);
    }
  }

  @Post('cv/parse-and-save')
async parseResumeAndSave(@Body() body: { cvId: string; url?: string }) {
  if (!body?.cvId) throw new BadRequestException('cvId is required');

  try {
    // Get CV from database
    const cv = await this.cvRepository.findOne({
      where: { id: body.cvId },
    });

    if (!cv) {
      throw new NotFoundException(`CV with id ${body.cvId} not found`);
    }

    // Determine PDF URL
    let pdfUrl: string;
    if (body.url) {
      pdfUrl = body.url;
    } else if (cv.fileId) {
      // Get file from database
      const file = await this.fileRepository.findOneBy({ 
        id: cv.fileId 
      });
      console.log('file', file);
      if (!file) {
        throw new BadRequestException(
          `File with id ${cv.fileId} not found`,
        );
      }

      // Use secureUrl if file is public, otherwise try to use url
      if (file.isPublic && file.secureUrl) {
        pdfUrl = file.secureUrl;
      } else if (file.secureUrl) {
        pdfUrl = file.secureUrl;
      } else if (file.url) {
        pdfUrl = file.url;
      } else {
        throw new BadRequestException(
          'CV file has no accessible URL. Please provide URL parameter or ensure file is public.',
        );
      }
    } else {
      throw new BadRequestException(
        'CV has no file associated. Please provide URL parameter.',
      );
    }

    // Step 1: Extract text from PDF (reuse existing logic)
    const res = await fetch(pdfUrl);
    if (!res.ok)
      throw new BadRequestException(
        `Download failed: ${res.status} ${res.statusText}`,
      );
    const buf = Buffer.from(await res.arrayBuffer());
    const base64 = buf.toString('base64');

    const extractResult = await this.ai.generateWithInlineFile({
      prompt: ENHANCE_RESUME_EXTRACTION_PROMPT,
      inline: { dataBase64: base64, mimeType: 'application/pdf' },
      temperature: 0,
    });

    const extractedData = this.extractJsonFromMarkdown(String(extractResult.content || ''));

    let cvContent: any;
    let extractedText: string;

    if (extractedData && typeof extractedData === 'object') {
      // AI returned structured JSON - convert directly to CVContent
      extractedText = String(extractResult.content || ''); // Keep original for storage
      
      // Convert JSON object to CVContent format
      cvContent = this.convertJsonToCVContent(extractedData);
    } else {
      // AI returned plain text - parse it
      extractedText = typeof extractedData === 'string' 
        ? extractedData 
        : String(extractResult.content || '');
      
      if (!extractedText || typeof extractedText !== 'string') {
        throw new BadRequestException('Failed to extract text from PDF. No text content found.');
      }
      
      // Parse text to CVContent
      cvContent = parseResumeTextToCVContent(extractedText);
    }

    // Ensure extractedText is a non-empty string for storage
    if (!extractedText || typeof extractedText !== 'string') {
      extractedText = String(extractResult.content || '');
    }

    // Step 3: Update CV in database
    await this.cvRepository.update(cv.id, {
      content: cvContent as CV['content'],
      extractedText: extractedText,
      parsingStatus: ParsingStatus.PARSED,
      parsedAt: new Date(),
    } as Partial<CV>);

    return {
      success: true,
      message: 'CV parsed and saved successfully',
      data: {
        cvId: cv.id,
        extractedText,
        cvContent,
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Update CV status to failed if it exists
    if (body?.cvId) {
      try {
        await this.cvRepository.update(body.cvId, {
          parsingStatus: ParsingStatus.FAILED,
        });
      } catch (updateError) {
        // Ignore update error
      }
    }
    
    throw new BadRequestException(`Parse and save failed: ${message}`);
  }
}
  private extractJsonFromMarkdown(content: string): null {
    console.log('content', content);
    try {
      // Remove markdown code block markers if present
      let jsonString = content.trim();

      // Check if content starts with ```json or ``` and remove it
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.substring(7); // Remove ```json
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.substring(3); // Remove ```
      }

      // Remove trailing ``` if present
      if (jsonString.endsWith('```')) {
        jsonString = jsonString.substring(0, jsonString.length - 3);
      }

      // Trim whitespace and newlines
      jsonString = jsonString.trim();

      // Parse the JSON
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to parse JSON from markdown:', error);
      return null;
    }
  }
  private convertJsonToCVContent(jsonData: any): any {
    return {
      personalInfo: jsonData.personalInfo || {},
      summary: jsonData.summary || jsonData.objective || '',
      workExperience: (jsonData.workExperience || []).map((exp: any) => ({
        id: exp.id || Math.random().toString(36).substr(2, 9),
        company: exp.company || '',
        position: exp.position || exp.title || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || (exp.current ? undefined : ''),
        current: exp.current || exp.endDate === 'Present' || !exp.endDate,
        description: exp.description || (exp.responsibilities || []).join('\n'),
        technologies: exp.techStack || exp.technologies || [],
        achievements: exp.achievements || [],
      })),
      education: (jsonData.education || []).map((edu: any) => ({
        id: edu.id || Math.random().toString(36).substr(2, 9),
        institution: edu.institution || edu.school || '',
        degree: edu.degree || '',
        fieldOfStudy: edu.fieldOfStudy || edu.major || '',
        startDate: edu.startDate || '',
        endDate: edu.endDate || '',
        gpa: typeof edu.gpa === 'string' ? parseFloat(edu.gpa) : edu.gpa,
        honors: edu.honors || [],
      })),
      skills: {
        technical: Array.isArray(jsonData.skills) 
          ? jsonData.skills 
          : (jsonData.skills?.technical || []),
        soft: jsonData.skills?.soft || [],
        languages: jsonData.skills?.languages || [],
      },
      certifications: (jsonData.certifications || []).map((cert: any) => ({
        id: cert.id || Math.random().toString(36).substr(2, 9),
        name: cert.name || cert.title || '',
        issuer: cert.issuer || cert.organization || '',
        issueDate: cert.issueDate || cert.date || '',
        expiryDate: cert.expiryDate,
        credentialId: cert.credentialId || cert.id,
        url: cert.url,
      })),
      projects: (jsonData.projects || []).map((proj: any) => ({
        id: proj.id || Math.random().toString(36).substr(2, 9),
        name: proj.name || proj.title || '',
        description: proj.description || '',
        startDate: proj.startDate || '',
        endDate: proj.endDate,
        technologies: proj.techStack || proj.technologies || [],
        url: proj.url,
        github: proj.github,
      })),
    };
  }
}
