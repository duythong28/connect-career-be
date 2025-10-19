import { ApiProperty } from '@nestjs/swagger';

export class BaseResponse {
  @ApiProperty({ description: 'Response code', example: '200' })
  statusCode: string;

  @ApiProperty({ description: 'Response message', example: 'Success' })
  message: string;

  constructor(statusCode: string = '200', message: string = 'Success') {
    this.statusCode = statusCode;
    this.message = message;
  }
}

export class ObjectResponse<T> extends BaseResponse {
  @ApiProperty({ description: 'Response data' })
  data: T;

  constructor(
    data: T,
    statusCode: string = '200',
    message: string = 'Success',
  ) {
    super(statusCode, message);
    this.data = data;
  }
}

export class PagingMetadata {
  @ApiProperty({ description: 'Current page number', example: 1 })
  pageNumber: number;

  @ApiProperty({ description: 'Total number of pages', example: 10 })
  totalPages: number;

  @ApiProperty({ description: 'Number of items per page', example: 20 })
  pageSize: number;

  @ApiProperty({
    description: 'Total number of items across all pages',
    example: 200,
  })
  totalElements: number;

  constructor(
    pageNumber: number,
    totalPages: number,
    pageSize: number,
    totalElements: number,
  ) {
    this.pageNumber = pageNumber;
    this.totalPages = totalPages;
    this.pageSize = pageSize;
    this.totalElements = totalElements;
  }
}

export class PagedResponse<T> extends BaseResponse {
  @ApiProperty({ description: 'Response data', type: [Object] })
  data: T[];

  @ApiProperty({ description: 'Pagination metadata' })
  pageable: PagingMetadata;

  constructor(
    data: T[],
    pageNumber: number,
    pageSize: number,
    totalElements: number,
    statusCode: string = '200',
    message: string = 'Success',
  ) {
    super(statusCode, message);

    this.data = data;

    const totalPages = Math.ceil(totalElements / pageSize);
    this.pageable = new PagingMetadata(
      pageNumber,
      totalPages,
      pageSize,
      totalElements,
    );
  }
}
