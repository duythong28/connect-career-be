import { HttpException, HttpStatus } from '@nestjs/common';

export class IntentDetectionException extends HttpException {
  constructor(
    message: string,
    public readonly userMessage?: string,
    public readonly errorDetails?: Error,
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        userMessage: userMessage || 'Unable to understand your request. Please try rephrasing.',
        errorDetails: errorDetails
          ? { message: errorDetails.message, stack: errorDetails.stack }
          : undefined,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

