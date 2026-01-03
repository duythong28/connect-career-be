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
import { PaymentTransaction } from '../../domain/entities/payment-transaction.entity';
import { Refund } from '../../domain/entities/refund.entity';

@Injectable()
export class WalletBackofficeService {
  constructor(
    @InjectRepository(UserWallet)
    private walletRepository: Repository<UserWallet>,
    @InjectRepository(WalletTransaction)
    private transactionRepository: Repository<WalletTransaction>,
    @InjectRepository(UsageLedger)
    private usageLedgerRepository: Repository<UsageLedger>,
    @InjectRepository(PaymentTransaction)
    private paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
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

    // Remove the left joins - they don't work without proper relations
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

    // Collect all unique IDs to load in batch
    const usageLedgerIds = [
      ...new Set(
        data
          .map((t) => t.relatedUsageLedgerId)
          .filter((id): id is string => !!id),
      ),
    ];
    const paymentTransactionIds = [
      ...new Set(
        data
          .map((t) => t.relatedPaymentTransactionId)
          .filter((id): id is string => !!id),
      ),
    ];
    const refundIds = [
      ...new Set(
        data.map((t) => t.relatedRefundId).filter((id): id is string => !!id),
      ),
    ];

    // Load all related entities in parallel
    const [usageLedgers, paymentTransactions, refunds] = await Promise.all([
      usageLedgerIds.length > 0
        ? this.usageLedgerRepository.find({
            where: usageLedgerIds.map((id) => ({ id })),
            relations: ['action'],
          })
        : [],
      paymentTransactionIds.length > 0
        ? this.paymentTransactionRepository.find({
            where: paymentTransactionIds.map((id) => ({ id })),
          })
        : [],
      refundIds.length > 0
        ? this.refundRepository.find({
            where: refundIds.map((id) => ({ id })),
            relations: ['paymentTransaction'],
          })
        : [],
    ]);

    // Create maps for quick lookup
    const usageMap = new Map<string, UsageLedger>(
      usageLedgers.map((u) => [u.id, u] as [string, UsageLedger]),
    );
    const paymentMap = new Map<string, PaymentTransaction>(
      paymentTransactions.map((p) => [p.id, p] as [string, PaymentTransaction]),
    );
    const refundMap = new Map<string, Refund>(
      refunds.map((r) => [r.id, r] as [string, Refund]),
    );
    // Map transactions with related entities using correct field names
    const transactionsWithRelations = data.map((transaction) => {
      const result: any = { ...transaction };

      // Add related usage ledger with correct field name
      if (transaction.relatedUsageLedgerId) {
        result.relatedUsageLedger =
          usageMap.get(transaction.relatedUsageLedgerId) || null;
      }

      // Add related payment transaction with correct field name
      if (transaction.relatedPaymentTransactionId) {
        result.relatedPaymentTransaction =
          paymentMap.get(transaction.relatedPaymentTransactionId) || null;
      }

      // Add related refund
      if (transaction.relatedRefundId) {
        result.relatedRefund =
          refundMap.get(transaction.relatedRefundId) || null;
      }

      return result;
    });

    return {
      data: transactionsWithRelations,
      total,
      page: query.pageNumber,
      limit: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
      currentBalance: wallet.creditBalance,
    };
  }
  async getWalletTransactionById(
    transactionId: string,
  ): Promise<WalletTransaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['wallet'],
    });

    if (!transaction) {
      throw new NotFoundException(
        'Wallet transaction not found or you do not have access to it',
      );
    }

    return transaction;
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
