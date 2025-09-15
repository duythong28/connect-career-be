import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { IdentityException } from '../exceptions/identity.exceptions';

@Catch(IdentityException, HttpException)
export class IdentityExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(IdentityExceptionFilter.name);

  catch(exception: IdentityException | HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status = exception.getStatus();
    const message = exception.message;
    const timestamp = new Date().toISOString();
    const path = request.url;

    // Log the error for monitoring
    this.logger.error(
      `${request.method} ${path} - ${status} - ${message}`,
      exception.stack,
    );

    // Prepare error response
    const errorResponse = {
      statusCode: status,
      timestamp,
      path,
      message,
      error: exception.name,
    };

    // Add additional context for development
    if (process.env.NODE_ENV === 'development') {
      errorResponse['stack'] = exception.stack;
    }

    response.status(status).json(errorResponse);
  }
}
