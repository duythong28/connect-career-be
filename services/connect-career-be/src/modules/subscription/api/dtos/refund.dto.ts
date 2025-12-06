// src/modules/subscription/api/dtos/backoffice/refund.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationDto } from 'src/shared/kernel';
import { RefundStatus } from 'src/modules/subscription/domain/entities/refund.entity';

export class RefundListQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  minAmount?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxAmount?: number;
}

export class CreateRefundDto {
  @ApiProperty()
  @IsUUID()
  paymentTransactionId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class ProcessRefundDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  adminNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  autoProcess?: boolean;
}

export class RejectRefundDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  reason: string;
}

export class ReverseRefundDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  reason: string;
}
