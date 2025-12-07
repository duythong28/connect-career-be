import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import {
  DEFAULT_PAGE_NUMBER,
  DEFAULT_PAGE_SIZE,
  PaginationParams,
} from './pagination.interface';

/**
 * Parameter decorator that extracts and validates pagination parameters from the request
 * @returns Validated pagination parameters object
 */
export const Pagination = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PaginationParams => {
    const request = ctx.switchToHttp().getRequest();
    const query = request.query;

    // Extract and validate pagination parameters
    const pageNumber = extractPageNumber(query.pageNumber);
    const pageSize = extractPageSize(query.pageSize);
    const searchTerm = query.searchTerm
      ? String(query.searchTerm).trim()
      : undefined;

    // Create pagination object
    return {
      pageNumber,
      pageSize,
      searchTerm,
    };
  },
);

/**
 * Extracts and validates page number from query parameter
 * @param pageNumberParam - Raw page number from query
 * @returns Validated page number
 */
function extractPageNumber(pageNumberParam: unknown): number {
  if (!pageNumberParam) {
    return DEFAULT_PAGE_NUMBER;
  }

  const pageNumber = parseInt(String(pageNumberParam), 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    throw new BadRequestException('Page number must be a positive integer');
  }

  return pageNumber - 1;
}

/**
 * Extracts and validates page size from query parameter
 * @param pageSizeParam - Raw page size from query
 * @returns Validated page size
 */
function extractPageSize(pageSizeParam: unknown): number {
  if (!pageSizeParam) {
    return DEFAULT_PAGE_SIZE;
  }

  const pageSize = parseInt(String(pageSizeParam), 10);

  if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new BadRequestException('Page size must be between 1 and 100');
  }

  return pageSize;
}

/**
 * Creates a pagination object with default values
 * @returns Default pagination parameters
 */
export function createDefaultPagination(): PaginationParams {
  return {
    pageNumber: DEFAULT_PAGE_NUMBER,
    pageSize: DEFAULT_PAGE_SIZE,
    searchTerm: undefined,
  };
}
