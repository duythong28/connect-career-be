import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Refund, RefundStatus } from '../../domain/entities/refund.entity';
import { In, Repository } from 'typeorm';
import { UserWallet } from '../../domain/entities/user-wallet.entity';
import {
  PaymentTransaction,
  PaymentType,
} from '../../domain/entities/payment-transaction.entity';
import {
  TransactionStatus,
  TransactionType,
  WalletTransaction,
} from '../../domain/entities/wallet-transaction.entity';
import { PaymentService } from './payment.service';
import {
  CreateRefundDto,
  ProcessRefundDto,
  RefundListQueryDto,
  RejectRefundDto,
} from '../dtos/refund.dto';
import { CurrencyConversionService } from './currency-conversion.service';

@Injectable()
export class RefundBackofficeService {
  constructor(
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
    @InjectRepository(PaymentTransaction)
    private paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(UserWallet)
    private walletRepository: Repository<UserWallet>,
    @InjectRepository(WalletTransaction)
    private walletTransactionRepository: Repository<WalletTransaction>,
    private paymentService: PaymentService,
    private readonly currencyConversionService: CurrencyConversionService, 
  ) {}
  async getRefunds(query: RefundListQueryDto) {
    const queryBuilder = this.refundRepository
      .createQueryBuilder('refund')
      .leftJoinAndSelect('refund.user', 'user')
      .leftJoinAndSelect('refund.paymentTransaction', 'paymentTransaction');

    if (query.status) {
      queryBuilder.andWhere('refund.status = :status', {
        status: query.status,
      });
    }

    if (query.userId) {
      queryBuilder.andWhere('refund.userId = :userId', {
        userId: query.userId,
      });
    }

    if (query.dateFrom) {
      queryBuilder.andWhere('refund.createdAt >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }

    if (query.dateTo) {
      queryBuilder.andWhere('refund.createdAt <= :dateTo', {
        dateTo: query.dateTo,
      });
    }

    if (query.minAmount) {
      queryBuilder.andWhere('refund.amount >= :minAmount', {
        minAmount: query.minAmount,
      });
    }

    if (query.maxAmount) {
      queryBuilder.andWhere('refund.amount <= :maxAmount', {
        maxAmount: query.maxAmount,
      });
    }

    queryBuilder.orderBy('refund.createdAt', 'DESC');

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
    };
  }

  async getRefundById(id: string) {
    const refund = await this.refundRepository.findOne({
      where: { id },
      relations: ['user', 'paymentTransaction', 'paymentTransaction.wallet'],
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    return refund;
  }

  async createRefund(dto: CreateRefundDto, adminId: string) {
    const paymentTransaction = await this.paymentTransactionRepository.findOne({
      where: { id: dto.paymentTransactionId },
      relations: ['wallet'],
    });

    if (!paymentTransaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (dto.amount > paymentTransaction.amount) {
      throw new BadRequestException(
        'Refund amount cannot exceed payment amount',
      );
    }

    const existingRefund = await this.refundRepository.findOne({
      where: {
        paymentTransactionId: dto.paymentTransactionId,
        status: In([
          RefundStatus.PENDING,
          RefundStatus.APPROVED,
          RefundStatus.PROCESSED,
        ]),
      },
    });

    if (existingRefund) {
      throw new BadRequestException('Refund already exists for this payment');
    }

    const refund = this.refundRepository.create({
      userId: paymentTransaction.userId,
      paymentTransactionId: dto.paymentTransactionId,
      amount: dto.amount,
      currency: paymentTransaction.currency,
      reason: dto.reason,
      adminNotes: dto.adminNotes,
      status: RefundStatus.APPROVED,
      processedBy: adminId,
      processedAt: new Date(),
    });

    await this.refundRepository.save(refund);
    await this.processRefund(refund.id, { autoProcess: true }, adminId);
    return refund;
  }

  async processRefund(
    refundId: string,
    dto: ProcessRefundDto,
    adminId: string,
  ): Promise<Refund> {
    const refund = await this.refundRepository.findOne({
      where: { id: refundId },
      relations: ['paymentTransaction', 'paymentTransaction.wallet'],
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== RefundStatus.PENDING && !dto.autoProcess) {
      throw new BadRequestException('Refund is not in pending status');
    }

    refund.status = RefundStatus.APPROVED;
    refund.processedBy = adminId;
    refund.processedAt = new Date();
    refund.adminNotes = dto.adminNotes || refund.adminNotes;

    await this.refundRepository.save(refund);

    try {
      const refundResult = await this.paymentService.refundPayment(
        refund.paymentTransaction.provider,
        refund.paymentTransaction.providerTransactionId ||
          refund.paymentTransaction.id,
        refund.amount,
        refund.reason,
      );

      refund.status = RefundStatus.PROCESSED;
      refund.providerRefundId = refundResult.refundId;
      refund.metadata = { gatewayResponse: refundResult };

      if (refund.paymentTransaction.type === PaymentType.TOP_UP) {
        const wallet = refund.paymentTransaction.wallet;
        const balanceBefore = wallet.creditBalance;
        
        // FIX: Convert amount if needed (for VND to USD)
        let amountToDebit = refund.amount;

        if (
          (refund.paymentTransaction.provider === 'momo' || 
           refund.paymentTransaction.provider === 'zalopay') &&
          refund.currency !== wallet.currency
        ) {
          try {
            amountToDebit = await this.currencyConversionService.convert(
              refund.amount,
              refund.currency, // VND
              wallet.currency, // USD
            );

            this.logger.log(
              `Converted refund ${refund.amount} ${refund.currency} to ${amountToDebit} ${wallet.currency} for wallet debit`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to convert currency for refund ${refund.id}: ${error.message}`,
            );
            throw new Error(
              `Currency conversion failed: ${error.message}. Cannot debit wallet.`,
            );
          }
        }

        // Use converted amount for wallet debit
        wallet.creditBalance -= amountToDebit;
        const balanceAfter = wallet.creditBalance;

        await this.walletRepository.save(wallet);

        await this.walletTransactionRepository.save({
          walletId: wallet.id,
          userId: wallet.userId,
          type: TransactionType.DEBIT,
          amount: amountToDebit, // Use converted amount
          currency: wallet.currency, // Use wallet currency
          balanceBefore,
          balanceAfter,
          status: TransactionStatus.COMPLETED,
          description: `Refund for payment ${refund.paymentTransactionId} (${refund.amount} ${refund.currency} → ${amountToDebit} ${wallet.currency})`,
          relatedRefundId: refund.id,
          relatedPaymentTransactionId: refund.paymentTransactionId,
          metadata: {
            originalAmount: refund.amount,
            originalCurrency: refund.currency,
            convertedAmount: amountToDebit,
            exchangeRate: amountToDebit / refund.amount,
          },
        });
      }

      await this.refundRepository.save(refund);
      return refund;
    } catch (error) {
      refund.status = RefundStatus.FAILED;
      refund.metadata = {
        ...refund.metadata,
        error: (error as Error).message,
      };
      await this.refundRepository.save(refund);
      throw error;
    }
  }
  async rejectRefund(refundId: string, dto: RejectRefundDto, adminId: string) {
    const refund = await this.refundRepository.findOne({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Only pending refunds can be rejected');
    }

    refund.status = RefundStatus.REJECTED;
    refund.processedBy = adminId;
    refund.processedAt = new Date();
    refund.adminNotes = dto.reason;

    await this.refundRepository.save(refund);
    return refund;
  }

  async getStatistics(query: RefundListQueryDto) {
    const queryBuilder = this.refundRepository.createQueryBuilder('refund');

    if (query.dateFrom) {
      queryBuilder.andWhere('refund.createdAt >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }

    if (query.dateTo) {
      queryBuilder.andWhere('refund.createdAt <= :dateTo', {
        dateTo: query.dateTo,
      });
    }

    const [totalRefunds, totalAmount, byStatus, byReason] = (await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.select('SUM(refund.amount)', 'total').getRawOne(),
      queryBuilder
        .select('refund.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('refund.status')
        .getRawMany(),
      queryBuilder
        .select('refund.reason', 'reason')
        .addSelect('COUNT(*)', 'count')
        .where('refund.reason IS NOT NULL')
        .groupBy('refund.reason')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany(),
    ])) as [
      number,
      { total: string },
      { status: RefundStatus; count: number }[],
      { reason: string; count: number }[],
    ];

    return {
      totalRefunds,
      totalAmount: parseFloat(totalAmount?.total || '0'),
      byStatus,
      topReasons: byReason,
    };
  }
}
