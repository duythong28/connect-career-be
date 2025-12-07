// src/modules/subscription/api/dtos/backoffice/billable-actions.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationDto } from 'src/shared/kernel';
import { ActionCategory } from 'src/modules/subscription/domain/entities/billable-action.entity';

export class BillableActionsListQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsEnum(ActionCategory)
  @IsOptional()
  category?: ActionCategory;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;
}

export class CreateBillableActionDto {
  @ApiProperty()
  @IsString()
  actionCode: string;

  @ApiProperty()
  @IsString()
  actionName: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ActionCategory })
  @IsEnum(ActionCategory)
  category: ActionCategory;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  cost: number;

  @ApiProperty({ default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: any;
}

export class UpdateBillableActionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  actionName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: any;
}

export class UpdateBillableActionStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
