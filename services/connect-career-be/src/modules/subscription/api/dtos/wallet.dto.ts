// src/modules/subscription/api/dtos/wallet.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from 'src/shared/kernel';

export class TopUpWalletDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @ApiProperty()
  @IsString()
  provider: string; // 'stripe', 'paypal', 'momo', etc.

  @ApiProperty()
  @IsString()
  paymentMethod: string; // PaymentMethod enum

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  paymentMethodId?: string;
}

export class WalletBalanceResponseDto {
  @ApiProperty()
  balance: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  walletId: string;
}

export class WalletTransactionsQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dateTo?: string;
}

export class UsageHistoryQueryDto extends PaginationDto {
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
