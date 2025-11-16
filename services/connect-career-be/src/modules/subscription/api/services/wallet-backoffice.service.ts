import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserWallet } from '../../domain/entities/user-wallet.entity';
import {
  TransactionStatus,
  TransactionType,
  WalletTransaction,
} from '../../domain/entities/wallet-transaction.entity';
import { UsageLedger } from '../../domain/entities/usage-ledger.entity';
import {
  AdjustWalletBalanceDto,
  UsageHistoryQueryDto,
  WalletListQueryDto,
  WalletTransactionsQueryDto,
} from '../dtos/wallet-backoffice.dto';

@Injectable()
export class WalletBackofficeService {
  constructor(
    @InjectRepository(UserWallet)
    private walletRepository: Repository<UserWallet>,
    @InjectRepository(WalletTransaction)
    private transactionRepository: Repository<WalletTransaction>,
    @InjectRepository(UsageLedger)
    private usageLedgerRepository: Repository<UsageLedger>,
  ) {}

  async getWallets(query: WalletListQueryDto): Promise<{
    wallets: UserWallet[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryBuilder = this.walletRepository
      .createQueryBuilder('wallet')
      .leftJoinAndSelect('wallet.user', 'user');

    if (query.userId) {
      queryBuilder.andWhere('wallet.userId = :userId', {
        userId: query.userId,
      });
    }

    if (query.minBalance) {
      queryBuilder.andWhere('wallet.creditBalance >= :minBalance', {
        minBalance: query.minBalance,
      });
    }

    if (query.maxBalance) {
      queryBuilder.andWhere('wallet.creditBalance <= :maxBalance', {
        maxBalance: query.maxBalance,
      });
    }

    const [wallets, total] = await queryBuilder
      .skip((query.pageNumber - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    return {
      wallets,
      total,
      page: query.pageNumber,
      limit: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async getWalletByUserId(userId: string) {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }

  async adjustBalance(
    userId: string,
    dto: AdjustWalletBalanceDto,
    adminId: string,
  ) {
    const wallet = await this.walletRepository.findOne({ where: { userId } });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const balanceBefore = wallet.creditBalance;
    wallet.creditBalance += dto.amount;
    const balanceAfter = wallet.creditBalance;

    if (balanceAfter < 0 && !dto.allowNegative) {
      throw new BadRequestException('Balance cannot be negative');
    }

    await this.walletRepository.save(wallet);

    const transaction = this.transactionRepository.create({
      walletId: wallet.id,
      userId,
      type: dto.amount > 0 ? TransactionType.CREDIT : TransactionType.DEBIT,
      amount: Math.abs(dto.amount),
      currency: wallet.currency,
      balanceBefore,
      balanceAfter,
      status: TransactionStatus.COMPLETED,
      description: dto.reason || 'Admin adjustment',
      metadata: {
        adjustedBy: adminId,
        notes: dto.notes,
        reason: dto.reason,
      },
    });

    await this.transactionRepository.save(transaction);

    return { wallet, transaction };
  }

  async getWalletTransactions(
    userId: string,
    query: WalletTransactionsQueryDto,
  ) {
    const wallet = await this.walletRepository.findOne({ where: { userId } });

    if (!wallet) {
      return {
        data: [],
        total: 0,
        page: query.pageNumber,
        limit: query.pageSize,
        totalPages: 0,
      };
    }

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.walletId = :walletId', { walletId: wallet.id });

    if (query.type) {
      queryBuilder.andWhere('transaction.type = :type', { type: query.type });
    }

    if (query.status) {
      queryBuilder.andWhere('transaction.status = :status', {
        status: query.status,
      });
    }

    if (query.dateFrom) {
      queryBuilder.andWhere('transaction.createdAt >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }

    if (query.dateTo) {
      queryBuilder.andWhere('transaction.createdAt <= :dateTo', {
        dateTo: query.dateTo,
      });
    }

    queryBuilder.orderBy('transaction.createdAt', 'DESC');

    const [data, total] = await queryBuilder
      .skip((query.pageNumber - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    return {
      data,
      total,
      page: query.pageNumber,
      limit: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
      currentBalance: wallet.creditBalance,
    };
  }

  async getUsageHistory(userId: string, query: UsageHistoryQueryDto) {
    const wallet = await this.walletRepository.findOne({ where: { userId } });

    if (!wallet) {
      return {
        data: [],
        total: 0,
        page: 1,
        pageSize: query.pageSize,
        totalPages: 0,
      };
    }

    const queryBuilder = this.usageLedgerRepository
      .createQueryBuilder('usage')
      .leftJoinAndSelect('usage.action', 'action')
      .where('usage.userId = :userId', { userId });

    if (query.actionCode) {
      queryBuilder.andWhere('action.actionCode = :actionCode', {
        actionCode: query.actionCode,
      });
    }

    if (query.dateFrom) {
      queryBuilder.andWhere('usage.timestamp >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }

    if (query.dateTo) {
      queryBuilder.andWhere('usage.timestamp <= :dateTo', {
        dateTo: query.dateTo,
      });
    }

    queryBuilder.orderBy('usage.timestamp', 'DESC');

    const [data, total] = await queryBuilder
      .skip((query.pageNumber - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    const totalSpent = (await this.usageLedgerRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.amountDeducted)', 'total')
      .where('usage.userId = :userId', { userId })
      .getRawOne()) as { total: string };

    return {
      data,
      total,
      page: query.pageNumber,
      limit: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
      totalSpent: parseFloat(totalSpent?.total || '0'),
      currentBalance: wallet.creditBalance,
    };
  }
}
