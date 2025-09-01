import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';


export class PaginationDto {
  @ApiProperty({
    description: 'Page number (1-based indexing)',
    required: false,
    default: 1,
    type: Number,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNumber: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 10,
    type: Number,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize: number = 10;

  @ApiProperty({
    description: 'Search term to filter results',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  searchTerm?: string;

  /**
   * Calculate the number of items to skip based on page and limit
   */
  get skip(): number {
    return (this.pageNumber - 1) * this.pageSize;
  }

  /**
   * Get the limit for the query
   */
  get take(): number {
    return this.pageSize;
  }
}
