import { HttpException, HttpStatus } from '@nestjs/common';
import { BaseErrorCode } from './base-error-code';

export class CustomException extends HttpException {
  constructor(
    public readonly errorCode: BaseErrorCode,
    public readonly statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(errorCode.message, statusCode);
  }

  static fromMessage(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ): CustomException {
    return new CustomException(
      new BaseErrorCode(1, message, undefined, statusCode),
      statusCode,
    );
  }

  static fromError(
    message: string,
    code: number,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ): CustomException {
    return new CustomException(
      new BaseErrorCode(code, message, undefined, statusCode),
      statusCode,
    );
  }
}
