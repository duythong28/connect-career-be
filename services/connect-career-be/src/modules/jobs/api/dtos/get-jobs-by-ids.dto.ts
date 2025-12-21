import { IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetJobsByIdsDto {
  @ApiProperty({
    description: 'Array of job IDs to fetch',
    required: false,
  })
  @IsOptional()
  ids?: string[];
}
