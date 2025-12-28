import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/identity/api/guards/roles.guard';
import { Roles } from 'src/modules/identity/api/decorators/roles.decorator';
import * as currentUserDecorator from 'src/modules/identity/api/decorators/current-user.decorator';
import { WalletBackofficeService } from '../services/wallet-backoffice.service';
import {
  AdjustWalletBalanceDto,
  UsageHistoryQueryDto,
  WalletListQueryDto,
  WalletTransactionsQueryDto,
} from '../dtos/wallet-backoffice.dto';
import { UserWallet } from '../../domain/entities/user-wallet.entity';
import { TransactionDto } from '../dtos/wallet.dto';
import { WalletTransaction } from '../../domain/entities/wallet-transaction.entity';

@ApiTags('BackOffice - Wallet Management')
@Controller('v1/backoffice/wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('super_admin', 'admin')
export class WalletBackofficeController {
  constructor(
    private readonly walletBackofficeService: WalletBackofficeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all wallets' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'minBalance', required: false, type: Number })
  @ApiQuery({ name: 'maxBalance', required: false, type: Number })
  @ApiQuery({ name: 'pageNumber', required: false, type: Number, default: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, default: 10 })
  @ApiResponse({
    status: 200,
    description: 'List of wallets retrieved successfully',
  })
  async getWallets(@Query() query: WalletListQueryDto) {
    return this.walletBackofficeService.getWallets(query);
  }

  @Get('transactions/:id')
      @ApiOperation({ summary: 'Get wallet transaction by ID' })
      @ApiParam({ name: 'id', description: 'Wallet transaction ID' })
      @ApiResponse({
        status: 200,
        description: 'Wallet transaction retrieved successfully',
        type: TransactionDto,
      })
      @ApiResponse({ status: 404, description: 'Transaction not found' })
      async getTransactionById(
        @Param('id') id: string,
      ): Promise<WalletTransaction> {
        const transaction = await this.walletBackofficeService.getWalletTransactionById(
          id,
        );
        return transaction;
      }
  @Get(':userId')
  @ApiOperation({ summary: 'Get wallet by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Wallet details retrieved successfully',
    type: UserWallet,
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getWalletByUserId(@Param('userId') userId: string) {
    return this.walletBackofficeService.getWalletByUserId(userId);
  }

  @Post(':userId/adjust')
  @ApiOperation({ summary: 'Adjust wallet balance (credit or debit)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Wallet balance adjusted successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid adjustment request' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async adjustBalance(
    @Param('userId') userId: string,
    @Body() dto: AdjustWalletBalanceDto,
    @currentUserDecorator.CurrentUser()
    admin: currentUserDecorator.CurrentUserPayload,
  ) {
    return this.walletBackofficeService.adjustBalance(userId, dto, admin.sub);
  }

  @Get(':userId/transactions')
  @ApiOperation({ summary: 'Get wallet transactions for user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'pageNumber', required: false, type: Number, default: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, default: 10 })
  @ApiResponse({
    status: 200,
    description: 'Wallet transactions retrieved successfully',
  })
  async getWalletTransactions(
    @Param('userId') userId: string,
    @Query() query: WalletTransactionsQueryDto,
  ) {
    return this.walletBackofficeService.getWalletTransactions(userId, query);
  }

  @Get(':userId/usage-history')
  @ApiOperation({ summary: 'Get usage ledger history for user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'actionCode', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'pageNumber', required: false, type: Number, default: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, default: 10 })
  @ApiResponse({
    status: 200,
    description: 'Usage history retrieved successfully',
  })
  async getUsageHistory(
    @Param('userId') userId: string,
    @Query() query: UsageHistoryQueryDto,
  ) {
    return this.walletBackofficeService.getUsageHistory(userId, query);
  }
}
