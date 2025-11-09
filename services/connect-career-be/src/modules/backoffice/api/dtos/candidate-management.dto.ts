import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProfileCompletionStatus } from 'src/modules/profile/domain/entities/candidate-profile.entity';

export class CandidateListQueryDto {
  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by completion status',
    enum: ProfileCompletionStatus,
  })
  @IsOptional()
  @IsEnum(ProfileCompletionStatus)
  completionStatus?: ProfileCompletionStatus;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  limit?: number;
}

export class UpdateCandidateStatusDto {
  @ApiPropertyOptional({ description: 'Update completion status' })
  @IsOptional()
  @IsEnum(ProfileCompletionStatus)
  completionStatus?: ProfileCompletionStatus;

  @ApiPropertyOptional({ description: 'Verify candidate profile' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
