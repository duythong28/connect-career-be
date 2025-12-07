import { Injectable } from '@nestjs/common';
import { ITool } from '../../domain/interfaces/tool.interface';

@Injectable()
export class ValidationToolsService {
  getValidateEmailTool(): ITool {
    return {
      name: 'validate_email',
      description: 'Validate an email address format',
      parameters: [
        {
          name: 'email',
          type: 'string',
          description: 'Email address to validate',
          required: true,
        },
      ],
      execute: async (params: Record<string, any>) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(params.email);
        return {
          email: params.email,
          valid: isValid,
          message: isValid ? 'Valid email' : 'Invalid email format',
        };
      },
    };
  }

  getValidateUrlTool(): ITool {
    return {
      name: 'validate_url',
      description: 'Validate a URL format',
      parameters: [
        {
          name: 'url',
          type: 'string',
          description: 'URL to validate',
          required: true,
        },
      ],
      execute: async (params: Record<string, any>) => {
        try {
          new URL(params.url);
          return {
            url: params.url,
            valid: true,
            message: 'Valid URL',
          };
        } catch {
          return {
            url: params.url,
            valid: false,
            message: 'Invalid URL format',
          };
        }
      },
    };
  }

  getAllTools(): ITool[] {
    return [this.getValidateEmailTool(), this.getValidateUrlTool()];
  }
}
