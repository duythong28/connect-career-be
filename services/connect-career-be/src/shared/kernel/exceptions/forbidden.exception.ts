import { HttpStatus } from '@nestjs/common';
import { CustomException } from './custom.exception';
import { BaseErrorCode } from './base-error-code';

export class ForbiddenException extends CustomException {
  constructor(
    errorCode: BaseErrorCode,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(errorCode, statusCode);
  }

  static fromError(
    message: string,
    errorCode: number,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ): ForbiddenException {
    return new ForbiddenException(
      new BaseErrorCode(errorCode, message),
      statusCode,
    );
  }
}
