import { HttpException, HttpStatus } from '@nestjs/common';

export class AgentExecutionException extends HttpException {
  constructor(
    message: string,
    public readonly agentName?: string,
    public readonly errorDetails?: Error,
  ) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        agentName,
        errorDetails: errorDetails
          ? { message: errorDetails.message, stack: errorDetails.stack }
          : undefined,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

