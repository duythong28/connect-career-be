import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { WalletService } from '../services/wallet.service';
import * as decorators from 'src/modules/identity/api/decorators';
import {
  TopUpWalletDto,
  TransactionDto,
  UsageHistoryDto,
  WalletBalanceResponseDto,
  WalletStatisticsDto,
} from '../dtos/wallet.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';

@Controller('v1/wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private walletService: WalletService,
    private paymentService: PaymentService,
  ) {}

  @Get('balance')
  @ApiOperation({
    summary: 'Get wallet balance with transaction history and usage',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet information retrieved successfully',
    type: WalletBalanceResponseDto,
  })
  async getBalance(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ): Promise<WalletBalanceResponseDto> {
    const balance = await this.walletService.getWalletBalance(user.sub);
    const wallet = await this.walletService.getOrCreateWallet(user.sub);

    // Fetch additional data in parallel for better performance
    const [recentTransactions, recentUsageHistory, statistics] =
      await Promise.all([
        this.walletService.getRecentTransactions(user.sub, 10),
        this.walletService.getRecentUsageHistory(user.sub, 10),
        this.walletService.getWalletStatistics(user.sub),
      ]);

    // Map transactions to DTO
    const transactionDtos: TransactionDto[] = recentTransactions.map(
      (t): TransactionDto => ({
        id: t.id,
        type: t.type,
        amount: parseFloat(String(t.amount)) || 0,
        currency: t.currency,
        balanceBefore: parseFloat(String(t.balanceBefore)) || 0,
        balanceAfter: parseFloat(String(t.balanceAfter)) || 0,
        status: t.status,
        description: t.description || undefined,
        createdAt: t.createdAt,
      }),
    );

    // Map usage history to DTO
    const usageHistoryDtos: UsageHistoryDto[] = recentUsageHistory.map(
      (u): UsageHistoryDto => ({
        id: u.id,
        amountDeducted: parseFloat(String(u.amountDeducted)) || 0,
        currency: u.currency,
        balanceBefore: parseFloat(String(u.balanceBefore)) || 0,
        balanceAfter: parseFloat(String(u.balanceAfter)) || 0,
        action: u.action
          ? {
              actionCode: u.action.actionCode,
              actionName: u.action.actionName,
              description: u.action.description || undefined,
              category: u.action.category,
            }
          : undefined,
        timestamp: u.timestamp,
      }),
    );

    // Map statistics to DTO
    const statisticsDto: WalletStatisticsDto = {
      totalCredits: statistics.totalCredits,
      totalDebits: statistics.totalDebits,
      totalSpent: statistics.totalSpent,
    };

    return {
      balance: parseFloat(String(balance)) || 0,
      currency: wallet.currency,
      walletId: wallet.id,
      recentTransactions: transactionDtos,
      recentUsageHistory: usageHistoryDtos,
      statistics: statisticsDto,
    };
  }

  @Post('top-up')
  @ApiOperation({ summary: 'Initiate wallet top-up' })
  @ApiResponse({ status: 201, description: 'Top-up initiated' })
  async topUp(
    @Body() dto: TopUpWalletDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.paymentService.initiateTopUp(
      user.sub,
      dto.amount,
      dto.currency ?? 'USD',
      dto.provider,
      dto.paymentMethod,
    );
  }
}
