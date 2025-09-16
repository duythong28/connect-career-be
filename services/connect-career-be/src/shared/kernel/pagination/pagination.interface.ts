export interface PaginationParams {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
}

/**
 * Default pagination values
 */
export const DEFAULT_PAGE_NUMBER = 0;
export const DEFAULT_PAGE_SIZE = 10;
