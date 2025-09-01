import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE } from './pagination.interface';

/**
 * Decorator that adds standard pagination query parameters to an endpoint
 * @returns Decorator function
 */
export function ApiPagination() {
  return applyDecorators(
    ApiQuery({
      name: 'pageNumber',
      required: false,
      type: Number,
      example: DEFAULT_PAGE_NUMBER,
      description: 'Page number (1-based indexing)',
    }),
    ApiQuery({
      name: 'pageSize',
      required: false,
      type: Number,
      example: DEFAULT_PAGE_SIZE,
      description: 'Number of items per page',
    }),
    ApiQuery({
      name: 'searchTerm',
      required: false,
      type: String,
      description: 'Search term to filter results',
    }),
  );
}
