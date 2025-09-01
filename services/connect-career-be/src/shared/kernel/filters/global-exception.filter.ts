// Enhanced GlobalExceptionFilter
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { I18nService } from 'nestjs-i18n';
import { CustomException } from '../exceptions/custom.exception';
import { DomainException } from '../exceptions/domain.exception';
import { EnrichingDomainException } from '../exceptions/enriching-domain.exception';
import { TypeORMError, QueryFailedError } from 'typeorm';
import { RequestException } from '../exceptions/request.exception';

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isProduction = process.env.ENVIRONMENT === 'prod';
  constructor(private readonly i18n: I18nService) { }

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Log extra request context for better debugging
    const requestId = request.headers['x-request-id'] || 'unknown';
    const requestPath = request.path;
    const requestMethod = request.method;

    this.logger.error(`Error handling request ${requestId} ${requestMethod} ${requestPath}`);
    this.logger.error(exception instanceof Error ? exception.stack : exception);

    try {
      if (exception instanceof DomainException) {
        return this.handleDomainException(exception, response);
      }

      if (exception instanceof CustomException) {
        return this.handleCustomException(exception, response);
      }

      if (exception instanceof RequestException) {
        return this.handleRequestException(exception, response);
      }


      if (exception instanceof HttpException) {
        return this.handleHttpException(exception, response);
      }

      if (exception instanceof TypeORMError || exception instanceof QueryFailedError) {
        return this.handleDatabaseException(exception, response);
      }

      return this.handleUnknownException(exception, response);
    } catch (error) {
      this.logger.error('Error in exception filter:', error);
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        timestamp: new Date().toISOString(),
        path: requestPath,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Translates an error message using the i18n service
   * @param key The translation key
   * @param args Optional arguments for the translation
   * @returns The translated message or the original message if translation fails
   */
  private async translateErrorMessage(key: string, args?: Record<string, any>): Promise<string> {
    if (!key || !this.i18n) {
      return args?.message || key || 'Unknown error';
    }

    try {
      const keyFormats = [
        `common.${key}`,                // With common namespace
        key,                            // Original key
        key.includes('.') ? key : `common.errors.${key}` // Full path if needed
      ];

      for (const formatKey of keyFormats) {
        try {
          const translated = await this.i18n.translate(formatKey, { args });

          // Check if translation was successful (not returning the key itself)
          if (translated && translated !== formatKey && typeof translated === 'string') {
            return translated;
          }
        } catch {
          continue;
        }
      }

      // If no translation found, return message from args or the original key
      return args?.message || key;
    } catch (error) {
      this.logger.debug(`Translation error for key "${key}": ${error instanceof Error ? error.message : String(error)}`);
      return args?.message || key || 'Unknown error';
    }
  }

  /**
   * Handle domain exceptions - these are business logic errors from the domain layer
   */
  private async handleDomainException(exception: DomainException, response: Response) {
    const errorCode = exception.errorCode;
    const statusCode = errorCode.statusCode || HttpStatus.BAD_REQUEST;

    let message: string;
    if (typeof errorCode.code === 'number') {
      message = await this.translateErrorMessage(`errors.${errorCode.code}`, errorCode);
    } else {
      message = await this.translateErrorMessage(`errors.domain.${errorCode.name || errorCode.code}`, errorCode);
    }

    if (!this.isProduction) {
      this.logger.debug(`Domain exception: ${errorCode.code} - ${message}`);
    }

    const responseBody = {
      success: false,
      timestamp: new Date().toISOString(),
      statusCode,
      code: errorCode.code,
      message,
      type: 'domain_error'
    };

    return response.status(statusCode).json(responseBody);
  }

  private async handleCustomException(exception: CustomException, response: Response) {
    const errorCode = exception.errorCode;
    const statusCode = errorCode.statusCode || HttpStatus.BAD_REQUEST;

    let message: string;
    if (typeof errorCode.code === 'number') {
      message = await this.translateErrorMessage(`errors.${errorCode.code}`, errorCode);
    } else {
      message = await this.translateErrorMessage(`errors.custom.${errorCode.name || errorCode.code}`, errorCode);
    }

    if (!this.isProduction) {
      this.logger.debug(`Custom exception: ${errorCode.code} - ${message}`);
    }

    const responseBody = {
      success: false,
      timestamp: new Date().toISOString(),
      statusCode,
      code: errorCode.code,
      message,
      type: 'custom_error'
    };

    if (exception instanceof EnrichingDomainException) {
      Object.assign(responseBody, {
        data: exception.enrichedData,
      });
    }

    return response.status(statusCode).json(responseBody);
  }

  private async handleHttpException(exception: HttpException, response: Response) {
    const statusCode = exception.getStatus();
    const responseBody = exception.getResponse();

    const formattedResponse: Record<string, any> = {
      success: false,
      timestamp: new Date().toISOString(),
      statusCode,
      type: 'http_error'
    };

    if (typeof responseBody === 'string') {
      formattedResponse.message = await this.translateErrorMessage(`errors.http.${statusCode}`, {
        message: responseBody
      });

      if (!this.isProduction) {
        this.logger.debug(`HTTP exception: ${statusCode} - ${formattedResponse.message}`);
      }
    } else if (responseBody && typeof responseBody === 'object') {
      const { message, error, details, code } = responseBody as Record<string, any>;

      if (code) {
        formattedResponse.code = code;
      }

      if (Array.isArray(message)) {
        formattedResponse.message = await this.translateErrorMessage('errors.validation.failed');
        formattedResponse.details = message;

        if (!this.isProduction) {
          this.logger.debug(`Validation exception: ${statusCode} - ${formattedResponse.message}`);
        }
      } else {
        const errorMessage = message || error;
        formattedResponse.message = await this.translateErrorMessage(`errors.http.${statusCode}`, {
          message: errorMessage
        });

        if (!this.isProduction) {
          this.logger.debug(`HTTP exception: ${statusCode} - ${formattedResponse.message}`);
        }
      }

      if (details) {
        formattedResponse.details = details;
      }
    }

    return response.status(statusCode).json(formattedResponse);
  }

  private async handleDatabaseException(exception: Error, response: Response) {
    const isUniqueConstraintError = exception.message.includes('unique constraint') ||
      exception.message.includes('duplicate key');

    const messageKey = isUniqueConstraintError
      ? 'errors.database.duplicate'
      : 'errors.database.operation_failed';

    const message = this.isProduction
      ? await this.translateErrorMessage(messageKey)
      : exception.message;

    return response.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      timestamp: new Date().toISOString(),
      statusCode: HttpStatus.BAD_REQUEST,
      message,
      code: isUniqueConstraintError ? 'DUPLICATE_ENTRY' : 'DATABASE_ERROR',
      details: this.isProduction ? undefined : exception.stack,
    });
  }

  private async handleUnknownException(exception: unknown, response: Response) {
    const messageKey = 'errors.unknown';
    const defaultMessage = exception instanceof Error ? exception.message : 'Unknown error occurred';

    const message = this.isProduction
      ? await this.translateErrorMessage(messageKey)
      : defaultMessage;

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      timestamp: new Date().toISOString(),
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: this.isProduction ? 'Internal server error' : message,
      details: this.isProduction ? undefined : (exception instanceof Error ? exception.stack : undefined),
    });
  }

  /**
   * Handles RequestException by translating the error message and returning a standardized response
   * @param exception The RequestException to handle
   * @param response The Express Response object
   * @returns The HTTP response
   */
  private async handleRequestException(exception: RequestException, response: Response) {
    const errorCode = exception.errorCode;
    const statusCode = errorCode.statusCode || HttpStatus.BAD_REQUEST;

    let message: string;
    if (typeof errorCode.code === 'number') {
      message = await this.translateErrorMessage(`errors.${errorCode.code}`, errorCode);
    } else {
      message = errorCode.message;
    }

    if (!this.isProduction) {
      this.logger.debug(`Request exception: ${errorCode.code} - ${message}`);
    }

    const responseBody = {
      success: false,
      timestamp: new Date().toISOString(),
      statusCode,
      code: errorCode.code,
      message,
      type: 'request_error'
    };

    return response.status(statusCode).json(responseBody);
  }
}