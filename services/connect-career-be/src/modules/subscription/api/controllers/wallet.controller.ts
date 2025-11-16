import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { WalletService } from '../services/wallet.service';
import * as decorators from 'src/modules/identity/api/decorators';
import { TopUpWalletDto, WalletBalanceResponseDto } from '../dtos/wallet.dto';
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
  async getBalance(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ): Promise<WalletBalanceResponseDto> {
    const balance = await this.walletService.getWalletBalance(user.sub);
    const wallet = await this.walletService.getOrCreateWallet(user.sub);
    return {
      balance,
      currency: wallet.currency,
      walletId: wallet.id,
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
