import { IsArray, IsUUID, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetJobsByIdsDto {
  @ApiProperty({
    description: 'Array of job IDs to fetch',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => {
    if (value == null) return undefined;
    if (typeof value === 'string') {
      if (value.includes(',')) {
        return value
          .split(',')
          .map((id: string) => id.trim())
          .filter(Boolean);
      }
      return [value.trim()];
    }
    if (Array.isArray(value)) {
      return value
        .map((id: string) => (typeof id === 'string' ? id.trim() : id))
        .filter(Boolean);
    }
    return undefined;
  })
  ids?: string[];
}
