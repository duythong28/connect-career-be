import { HttpStatus } from '@nestjs/common';
import { CustomException } from './custom.exception';
import { BaseErrorCode } from './base-error-code';

export class DomainException extends CustomException {
  /**
   * Create a new DomainException
   * @param messageOrErrorCode Either a string message or a BaseErrorCode object
   * @param errorCode Optional numeric error code (only used if first parameter is a string)
   * @param statusCode Optional HTTP status code
   */
  constructor(
    messageOrErrorCode: string | BaseErrorCode,
    errorCode?: number,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    if (messageOrErrorCode instanceof BaseErrorCode) {
      super(messageOrErrorCode, statusCode);
    } else {
      super(
        new BaseErrorCode(
          errorCode || HttpStatus.BAD_REQUEST,
          messageOrErrorCode,
          'DOMAIN_ERROR',
        ),
        statusCode,
      );
    }
  }

  /**
   * Create a DomainException from error details
   * @param message Error message
   * @param errorCode Numeric error code
   * @param statusCode HTTP status code
   */
  static fromError(
    message: string,
    errorCode: number = 400,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ): DomainException {
    return new DomainException(message, errorCode, statusCode);
  }
}
