import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationDto } from 'src/shared/kernel';
import {
  PaymentStatus,
  PaymentType,
} from 'src/modules/subscription/domain/entities/payment-transaction.entity';

export class PaymentTransactionsQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiPropertyOptional()
  @IsEnum(PaymentType)
  @IsOptional()
  type?: PaymentType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dateTo?: string;
}

export class UsageLedgerQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  actionCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dateTo?: string;
}

export class UpdateTransactionStatusDto {
  @ApiProperty()
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RefundTransactionDto {
  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}

export class RefundUsageDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}

export class BillingStatsQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dateTo?: string;
}

export class ExportBillingReportDto {
  @ApiProperty()
  @IsString()
  reportType: 'revenue' | 'transactions' | 'usage';

  @ApiProperty()
  @IsString()
  dateFrom: string;

  @ApiProperty()
  @IsString()
  dateTo: string;

  @ApiProperty()
  @IsString()
  format: 'csv' | 'pdf' | 'excel';
}
