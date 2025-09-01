import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';
import { BaseErrorCode } from './base-error-code';

export class EnrichingDomainException extends DomainException {
  constructor(
    errorCode: BaseErrorCode,
    public readonly enrichedData: Record<string, any>,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(errorCode, statusCode);
  }
}
