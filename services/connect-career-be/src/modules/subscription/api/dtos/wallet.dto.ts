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

export class TransactionDto {
  @ApiProperty({ description: 'Transaction ID' })
  id: string;

  @ApiProperty({
    description: 'Transaction type',
    enum: ['credit', 'debit', 'refund', 'adjustment'],
  })
  type: string;

  @ApiProperty({ description: 'Transaction amount' })
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Balance before transaction' })
  balanceBefore: number;

  @ApiProperty({ description: 'Balance after transaction' })
  balanceAfter: number;

  @ApiProperty({
    description: 'Transaction status',
    enum: ['pending', 'completed', 'failed', 'cancelled'],
  })
  status: string;

  @ApiPropertyOptional({ description: 'Transaction description' })
  description?: string;

  @ApiProperty({ description: 'Transaction creation date' })
  createdAt: Date;
}

export class BillableActionDto {
  @ApiProperty({ description: 'Action code' })
  actionCode: string;

  @ApiProperty({ description: 'Action name' })
  actionName: string;

  @ApiPropertyOptional({ description: 'Action description' })
  description?: string;

  @ApiProperty({
    description: 'Action category',
    enum: ['recruiter', 'candidate', 'both'],
  })
  category: string;
}

export class UsageHistoryDto {
  @ApiProperty({ description: 'Usage ledger ID' })
  id: string;

  @ApiProperty({ description: 'Amount deducted' })
  amountDeducted: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Balance before deduction' })
  balanceBefore: number;

  @ApiProperty({ description: 'Balance after deduction' })
  balanceAfter: number;

  @ApiPropertyOptional({
    description: 'Billable action details',
    type: BillableActionDto,
  })
  action?: BillableActionDto;

  @ApiProperty({ description: 'Usage timestamp' })
  timestamp: Date;
}

export class WalletStatisticsDto {
  @ApiProperty({ description: 'Total credits received' })
  totalCredits: number;

  @ApiProperty({ description: 'Total debits made' })
  totalDebits: number;

  @ApiProperty({ description: 'Total spent on billable actions' })
  totalSpent: number;
}

export class WalletBalanceResponseDto {
  @ApiProperty({ description: 'Current wallet balance' })
  balance: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Wallet ID' })
  walletId: string;

  @ApiPropertyOptional({
    description: 'Recent wallet transactions (last 10)',
    type: [TransactionDto],
  })
  recentTransactions?: TransactionDto[];

  @ApiPropertyOptional({
    description: 'Recent billable actions/usage history (last 10)',
    type: [UsageHistoryDto],
  })
  recentUsageHistory?: UsageHistoryDto[];

  @ApiPropertyOptional({
    description: 'Wallet statistics',
    type: WalletStatisticsDto,
  })
  statistics?: WalletStatisticsDto;
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
