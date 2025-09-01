import { HttpStatus } from '@nestjs/common';

export class BaseErrorCode {
  constructor(
    public readonly code: number,
    public readonly message: string,
    public readonly name?: string,
    public readonly statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {}

  toDescription(): string {
    return this.message;
  }

  static from(code: number, message: string): BaseErrorCode {
    return new BaseErrorCode(code, message);
  }
}
