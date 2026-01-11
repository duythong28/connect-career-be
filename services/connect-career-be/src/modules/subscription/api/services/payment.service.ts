// src/modules/subscription/api/services/payment.service.ts
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentTransaction,
  PaymentStatus,
  PaymentType,
  PaymentMethod,
} from '../../domain/entities/payment-transaction.entity';
import { WalletService } from './wallet.service';
import {
  PaymentMetadata,
  WebhookEvent,
} from '../../infrastructure/payment-providers/payment-provider.interface';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderFactory } from '../../infrastructure/payment-providers/payment-provider.factory';
import { User } from 'src/modules/identity/domain/entities';
import { CurrencyConversionService } from './currency-conversion.service';
import { Refund, RefundStatus } from '../../domain/entities/refund.entity';

export interface PaymentIntentResult {
  paymentId: string;
  clientSecret?: string;
  redirectUrl?: string;
  qrCode?: string;
  paymentUrl?: string;
  expiresAt?: Date;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gatewayResponse?: any;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  constructor(
    @InjectRepository(PaymentTransaction)
    private paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
    private walletService: WalletService,
    private configService: ConfigService,
    private paymentProviderFactory: PaymentProviderFactory,
    private readonly currencyConversionService: CurrencyConversionService,
  ) {}

  async initiateTopUp(
    userId: string,
    amount: number,
    currency: string,
    provider: string,
    paymentMethod: string,
  ): Promise<PaymentIntentResult> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const wallet = await this.walletService.getOrCreateWallet(userId);

    // Get payment provider
    const paymentProvider = this.paymentProviderFactory.getProvider(provider);

    if (
      !this.paymentProviderFactory.validateProviderPaymentMethod(
        provider,
        paymentMethod as PaymentMethod,
      )
    ) {
      const supportedMethods = paymentProvider.supportedMethods;
      throw new BadRequestException(
        `Payment method '${paymentMethod}' is not supported by provider '${provider}'. Supported methods: ${supportedMethods.join(', ')}`,
      );
    }

    // MOMO and ZaloPay always use VND
    const transactionCurrency =
      provider === 'momo' || provider === 'zalopay' ? 'VND' : currency;

    if (
      !this.paymentProviderFactory.validateProviderCurrency(
        provider,
        transactionCurrency,
      )
    ) {
      const supportedCurrencies = paymentProvider.supportedCurrencies;
      throw new BadRequestException(
        `Currency '${transactionCurrency}' is not supported by provider '${provider}'. Supported currencies: ${supportedCurrencies.join(', ')}`,
      );
    }

    const transaction = this.paymentTransactionRepository.create({
      walletId: wallet.id,
      userId,
      provider,
      providerPaymentId: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentMethod: paymentMethod as PaymentMethod,
      amount,
      currency: transactionCurrency, // Use VND for MOMO/ZaloPay
      status: PaymentStatus.PENDING,
      type: PaymentType.TOP_UP,
      description: `Wallet top-up of ${amount} ${transactionCurrency}`,
    });

    await this.paymentTransactionRepository.save(transaction);

    try {
      // Prepare metadata for payment provider
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';
      const apiUrl =
        this.configService.get<string>('API_URL') ||
        'https://strong-faithful-lemur.ngrok-free.app/api';

      const metadata: PaymentMetadata & { request?: Request } = {
        userId,
        walletId: wallet.id,
        paymentTransactionId: transaction.id,
        description: `Wallet top-up of ${amount} ${transactionCurrency}`,
        returnUrl: `${frontendUrl}/wallet/top-up/return`,
        cancelUrl: `${frontendUrl}/wallet/top-up/cancel`,
        notifyUrl: `${apiUrl}/v1/payments/${provider.toLowerCase()}/webhook`,
        userEmail: user?.email || '',
      };

      const intentResult: PaymentIntentResult =
        await paymentProvider.createPaymentIntent(
          amount,
          transactionCurrency,
          metadata,
        );

      // Update transaction with provider payment ID
      transaction.providerPaymentId = intentResult.paymentId;
      transaction.metadata = {
        ...transaction.metadata,
        paymentUrl: intentResult.paymentUrl,
        clientSecret: intentResult.clientSecret,
        redirectUrl: intentResult.redirectUrl,
        qrCode: intentResult.qrCode,
        expiresAt: intentResult.expiresAt?.toISOString(),
      };
      await this.paymentTransactionRepository.save(transaction);

      this.logger.log(
        `Payment intent created: ${transaction.id} for user ${userId} via ${provider}`,
      );

      return intentResult;
    } catch (error) {
      this.logger.error(
        `Failed to create payment intent for transaction ${transaction.id}`,
        error,
      );

      // Update transaction status to failed
      transaction.status = PaymentStatus.FAILED;
      transaction.failedAt = new Date();
      transaction.failureReason =
        error instanceof Error
          ? error.message
          : 'Failed to create payment intent';
      await this.paymentTransactionRepository.save(transaction);

      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Failed to initiate payment. Please try again.',
      );
    }
  }

  async confirmPayment(
    provider: string,
    paymentId: string,
    confirmationData?: any,
  ): Promise<PaymentResult> {
    // Find the payment transaction
    const transaction = await this.paymentTransactionRepository.findOne({
      where: { providerPaymentId: paymentId, provider: provider.toLowerCase() },
      relations: ['wallet'],
    });

    if (!transaction) {
      throw new NotFoundException(
        `Payment transaction not found for provider: ${provider}, paymentId: ${paymentId}`,
      );
    }

    // Prevent duplicate processing
    if (transaction.status === PaymentStatus.COMPLETED) {
      this.logger.warn(
        `Payment ${transaction.id} already completed, returning existing result`,
      );
      return {
        success: true,
        paymentId: transaction.id,
        transactionId: transaction.providerTransactionId || paymentId,
        amount: transaction.amount,
        currency: transaction.currency,
        status: PaymentStatus.COMPLETED,
        gatewayResponse: transaction.providerResponse,
      };
    }

    try {
      // Get payment provider
      const paymentProvider = this.paymentProviderFactory.getProvider(provider);

      // Confirm payment with provider
      const result = await paymentProvider.confirmPayment(
        paymentId,
        confirmationData,
      );

      // Update transaction based on result
      transaction.status = result.status;
      transaction.providerResponse = result.gatewayResponse;

      if (result.status === PaymentStatus.COMPLETED) {
        transaction.completedAt = new Date();
        transaction.providerTransactionId = result.transactionId;

        // Credit wallet only if not already credited
        if (transaction.status !== PaymentStatus.COMPLETED) {
          await this.walletService.creditWallet(
            transaction.walletId,
            transaction.amount,
            `Top-up via ${provider}`,
            { paymentTransactionId: transaction.id },
          );
        }
      } else if (result.status === PaymentStatus.FAILED) {
        transaction.failedAt = new Date();
        transaction.failureReason =
          result.gatewayResponse?.message || 'Payment confirmation failed';
      }

      await this.paymentTransactionRepository.save(transaction);

      this.logger.log(
        `Payment confirmed: ${transaction.id} - Status: ${result.status}`,
      );

      return {
        success: result.success,
        paymentId: transaction.id,
        transactionId: result.transactionId,
        amount: result.amount,
        currency: result.currency,
        status: result.status,
        gatewayResponse: result.gatewayResponse,
      };
    } catch (error) {
      this.logger.error(`Failed to confirm payment ${transaction.id}`, error);

      // Update transaction to failed
      transaction.status = PaymentStatus.FAILED;
      transaction.failedAt = new Date();
      transaction.failureReason =
        error instanceof Error ? error.message : 'Payment confirmation failed';
      await this.paymentTransactionRepository.save(transaction);

      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Failed to confirm payment. Please try again.',
      );
    }
  }

  async refundPayment(
    provider: string,
    transactionId: string,
    amount?: number,
    reason?: string,
  ): Promise<{ refundId: string; status: string }> {
    // Find the payment transaction
    const transaction = await this.paymentTransactionRepository.findOne({
      where: {
        providerTransactionId: transactionId,
        provider: provider.toLowerCase(),
      },
      relations: ['wallet'],
    });

    if (!transaction) {
      throw new NotFoundException(
        `Payment transaction not found for provider: ${provider}, transactionId: ${transactionId}`,
      );
    }

    if (transaction.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot refund payment with status: ${transaction.status}. Only completed payments can be refunded.`,
      );
    }

    try {
      // Get payment provider
      const paymentProvider = this.paymentProviderFactory.getProvider(provider);

      // Determine refund amount (default to full amount)
      const refundAmount = amount || transaction.amount;

      if (refundAmount > transaction.amount) {
        throw new BadRequestException(
          `Refund amount (${refundAmount}) cannot exceed original payment amount (${transaction.amount})`,
        );
      }

      // Process refund with provider
      const refundResult = await paymentProvider.refundPayment(
        transaction.providerPaymentId,
        refundAmount,
        reason,
      );

      // Update transaction status if full refund
      if (refundAmount >= transaction.amount) {
        transaction.status = PaymentStatus.REFUNDED;
      }

      transaction.providerResponse = {
        ...transaction.providerResponse,
        refund: refundResult,
      };
      await this.paymentTransactionRepository.save(transaction);

      this.logger.log(
        `Refund processed: ${refundResult.refundId} for transaction ${transaction.id}`,
      );

      return {
        refundId: refundResult.refundId,
        status: refundResult.status,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process refund for transaction ${transaction.id}`,
        error,
      );
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Failed to process refund. Please try again.',
      );
    }
  }

  async getPaymentStatus(
    provider: string,
    paymentId: string,
  ): Promise<PaymentStatus> {
    const transaction = await this.paymentTransactionRepository.findOne({
      where: { providerPaymentId: paymentId, provider: provider.toLowerCase() },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Payment transaction not found for provider: ${provider}, paymentId: ${paymentId}`,
      );
    }

    try {
      const paymentProvider = this.paymentProviderFactory.getProvider(provider);
      const status = await paymentProvider.getPaymentStatus(paymentId);

      // Update transaction status if it has changed
      if (status !== transaction.status) {
        transaction.status = status;
        if (status === PaymentStatus.COMPLETED && !transaction.completedAt) {
          transaction.completedAt = new Date();
        } else if (status === PaymentStatus.FAILED && !transaction.failedAt) {
          transaction.failedAt = new Date();
        }
        await this.paymentTransactionRepository.save(transaction);
      }

      return status;
    } catch (error) {
      this.logger.error(`Failed to get payment status for ${paymentId}`, error);
      // Return stored status if query fails
      return transaction.status;
    }
  }

  async processWebhookEvent(
    provider: string,
    webhookEvent: WebhookEvent,
  ): Promise<void> {
    // For Stripe refunds, we need to find transaction differently
    let transaction: PaymentTransaction | null = null;

    if (provider === 'stripe' && webhookEvent.type === 'payment.refunded') {
      // For Stripe refunds, try multiple ways to find the transaction
      const refundData = webhookEvent.data as any;

      // Try 1: Find by providerTransactionId (charge ID from refund)
      if (refundData?.charge) {
        const chargeId =
          typeof refundData.charge === 'string'
            ? refundData.charge
            : refundData.charge.id;

        transaction = await this.paymentTransactionRepository.findOne({
          where: {
            providerTransactionId: chargeId,
            provider: provider.toLowerCase(),
          },
          relations: ['wallet'],
        });
      }

      // Try 2: Find by payment intent ID from charge
      if (!transaction && refundData?.charge) {
        const chargeId =
          typeof refundData.charge === 'string'
            ? refundData.charge
            : refundData.charge.id;

        try {
          // We need to get the charge to find payment intent
          // But we don't have Stripe instance here, so try finding by providerPaymentId
          // which might be the payment intent ID
          const paymentProvider =
            this.paymentProviderFactory.getProvider(provider);
          if (paymentProvider && 'stripe' in paymentProvider) {
            // Search all completed transactions for this provider
            const transactions = await this.paymentTransactionRepository.find({
              where: {
                provider: provider.toLowerCase(),
                status: PaymentStatus.COMPLETED,
              },
              relations: ['wallet'],
            });

            // Check if any transaction has this charge ID in providerResponse
            transaction =
              transactions.find((t) => {
                const response = t.providerResponse as any;
                return (
                  response?.id === chargeId ||
                  response?.charge?.id === chargeId ||
                  t.providerTransactionId === chargeId
                );
              }) || null;
          }
        } catch (error) {
          this.logger.warn(
            `Error finding transaction by charge: ${error.message}`,
          );
        }
      }

      // Try 3: Find by providerPaymentId (our transaction ID from metadata)
      if (!transaction && webhookEvent.paymentId) {
        transaction = await this.paymentTransactionRepository.findOne({
          where: {
            providerPaymentId: webhookEvent.paymentId,
            provider: provider.toLowerCase(),
          },
          relations: ['wallet'],
        });
      }

      // Try 4: Find by refund ID if it's already in our system
      if (!transaction && refundData?.id) {
        const existingRefund = await this.refundRepository.findOne({
          where: {
            providerRefundId: refundData.id,
          },
          relations: ['paymentTransaction', 'paymentTransaction.wallet'],
        });

        if (existingRefund?.paymentTransaction) {
          transaction = existingRefund.paymentTransaction;
        }
      }
    } else {
      // For other events, use standard lookup
      transaction = await this.paymentTransactionRepository.findOne({
        where: {
          providerPaymentId: webhookEvent.paymentId,
          provider: provider.toLowerCase(),
        },
        relations: ['wallet'],
      });
    }

    if (!transaction) {
      this.logger.warn(
        `Payment transaction not found for provider: ${provider}, paymentId: ${webhookEvent.paymentId}`,
      );
      return;
    }

    try {
      // Update transaction status based on webhook event
      if (webhookEvent.type === 'payment.succeeded') {
        // Check if transaction is already completed to prevent duplicate wallet credits
        const wasAlreadyCompleted = transaction.status === PaymentStatus.COMPLETED;
        
        transaction.status = PaymentStatus.COMPLETED;
        transaction.completedAt = transaction.completedAt || new Date();
        transaction.providerResponse = webhookEvent.data;

        // Extract transaction ID from webhook data if available
        if (webhookEvent.data?.transactionId) {
          transaction.providerTransactionId = webhookEvent.data.transactionId;
        } else if (webhookEvent.data?.vnp_TransactionNo) {
          transaction.providerTransactionId =
            webhookEvent.data.vnp_TransactionNo;
        } else if (webhookEvent.data?.zp_trans_id) {
          transaction.providerTransactionId = String(
            webhookEvent.data.zp_trans_id,
          );
        } else if (webhookEvent.data?.transId) {
          transaction.providerTransactionId = String(webhookEvent.data.transId);
        } else if (webhookEvent.data?.id) {
          // For Stripe, use charge ID or payment intent ID
          transaction.providerTransactionId = String(webhookEvent.data.id);
        }

        await this.paymentTransactionRepository.save(transaction);

        // Credit wallet (only if not already credited)
        if (!wasAlreadyCompleted) {
          const wallet = await this.walletService.getOrCreateWallet(
            transaction.userId,
          );
          if (wallet.id === transaction.walletId) {
            // Convert amount to wallet currency if needed
            let amountToCredit = transaction.amount;

            // MOMO and ZaloPay process payments in VND
            if (
              (provider === 'momo' || provider === 'zalopay') &&
              transaction.currency !== wallet.currency
            ) {
              try {
                amountToCredit = await this.currencyConversionService.convert(
                  transaction.amount,
                  transaction.currency,
                  wallet.currency,
                );

                this.logger.log(
                  `Converted ${transaction.amount} ${transaction.currency} to ${amountToCredit} ${wallet.currency} for wallet credit`,
                );
              } catch (error) {
                this.logger.error(
                  `Failed to convert currency for payment ${transaction.id}: ${error.message}`,
                );
                // Throw error to prevent crediting wrong amount
                throw new Error(
                  `Currency conversion failed: ${error.message}. Cannot credit wallet.`,
                );
              }
            }

            await this.walletService.creditWallet(
              transaction.walletId,
              amountToCredit, // Use converted amount
              `Top-up via ${provider} (${transaction.amount} ${transaction.currency} → ${amountToCredit} ${wallet.currency})`,
              {
                paymentTransactionId: transaction.id,
                originalAmount: transaction.amount,
                originalCurrency: transaction.currency,
                convertedAmount: amountToCredit,
                exchangeRate: amountToCredit / transaction.amount,
              },
            );
          }
        } else {
          this.logger.log(
            `Payment already completed for transaction ${transaction.id}, skipping wallet credit`,
          );
        }

        this.logger.log(
          `Payment succeeded via webhook: ${transaction.id} for user ${transaction.userId}`,
        );
      } else if (webhookEvent.type === 'payment.updated') {
        // Handle payment update events (e.g., charge.updated with receipt_url)
        // Update transaction info without crediting wallet again
        transaction.providerResponse = webhookEvent.data;
        
        // Update provider transaction ID if available and not already set
        if (!transaction.providerTransactionId && webhookEvent.data?.id) {
          transaction.providerTransactionId = String(webhookEvent.data.id);
        }
        
        await this.paymentTransactionRepository.save(transaction);
        
        this.logger.log(
          `Payment updated via webhook: ${transaction.id} for user ${transaction.userId}`,
        );
      } else if (webhookEvent.type === 'payment.refunded') {
        // Handle refund webhook
        const refundData = webhookEvent.data as any;
        const refundAmount = refundData?.amount
          ? refundData.amount / 100 // Stripe amounts are in cents
          : transaction.amount; // Fallback to full amount

        // Check if refund already exists
        const existingRefund = await this.refundRepository.findOne({
          where: {
            providerRefundId: refundData?.id,
            paymentTransactionId: transaction.id,
          },
        });

        if (existingRefund) {
          this.logger.warn(
            `Refund ${refundData?.id} already processed for transaction ${transaction.id}`,
          );
          return;
        }

        // Create refund record
        const refund = this.refundRepository.create({
          userId: transaction.userId,
          paymentTransactionId: transaction.id,
          amount: refundAmount,
          currency: transaction.currency,
          status: RefundStatus.PROCESSED,
          providerRefundId: refundData?.id || `refund_${Date.now()}`,
          reason: refundData?.reason || 'Refund via webhook',
          processedAt: new Date(),
          metadata: {
            gatewayResponse: refundData,
            webhookEvent: webhookEvent.data,
          },
        });

        await this.refundRepository.save(refund);

        // Deduct wallet balance if this was a top-up
        if (transaction.type === PaymentType.TOP_UP) {
          const wallet = await this.walletService.getOrCreateWallet(
            transaction.userId,
          );

          if (wallet.id === transaction.walletId) {
            // Convert amount if needed (for VND to USD)
            let amountToDebit = refundAmount;

            if (
              (provider === 'momo' || provider === 'zalopay') &&
              transaction.currency !== wallet.currency
            ) {
              try {
                amountToDebit = await this.currencyConversionService.convert(
                  refundAmount,
                  transaction.currency, // VND
                  wallet.currency, // USD
                );

                this.logger.log(
                  `Converted refund ${refundAmount} ${transaction.currency} to ${amountToDebit} ${wallet.currency} for wallet debit`,
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

            await this.walletService.debitWallet(
              transaction.walletId,
              amountToDebit,
              `Refund for payment via ${provider} (${refundAmount} ${transaction.currency} → ${amountToDebit} ${wallet.currency})`,
              {
                paymentTransactionId: transaction.id,
                refundId: refund.id,
                originalAmount: refundAmount,
                originalCurrency: transaction.currency,
                convertedAmount: amountToDebit,
                exchangeRate: amountToDebit / refundAmount,
              },
            );
          }
        }

        // Update transaction status if full refund
        const totalRefunded = await this.refundRepository
          .createQueryBuilder('refund')
          .select('SUM(refund.amount)', 'total')
          .where('refund.paymentTransactionId = :transactionId', {
            transactionId: transaction.id,
          })
          .andWhere('refund.status = :status', {
            status: RefundStatus.PROCESSED,
          })
          .getRawOne();

        const totalRefundedAmount = parseFloat(totalRefunded?.total || '0');

        if (totalRefundedAmount >= transaction.amount) {
          transaction.status = PaymentStatus.REFUNDED;
        }

        transaction.providerResponse = {
          ...transaction.providerResponse,
          refunds: [
            ...((transaction.providerResponse as any)?.refunds || []),
            refundData,
          ],
        };

        await this.paymentTransactionRepository.save(transaction);

        this.logger.log(
          `Refund processed via webhook: ${refund.id} for transaction ${transaction.id} - Amount: ${refundAmount} ${transaction.currency}`,
        );
      } else if (webhookEvent.type === 'payment.failed') {
        transaction.status = PaymentStatus.FAILED;
        transaction.failedAt = new Date();
        transaction.failureReason =
          webhookEvent.data?.message ||
          webhookEvent.data?.return_message ||
          'Payment failed';
        transaction.providerResponse = webhookEvent.data;
        await this.paymentTransactionRepository.save(transaction);

        this.logger.log(
          `Payment failed via webhook: ${transaction.id} - ${transaction.failureReason}`,
        );
      } else if (webhookEvent.type === 'payment.cancelled') {
        transaction.status = PaymentStatus.CANCELLED;
        transaction.failureReason = 'Payment cancelled by user';
        transaction.providerResponse = webhookEvent.data;
        await this.paymentTransactionRepository.save(transaction);

        this.logger.log(`Payment cancelled via webhook: ${transaction.id}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process webhook event for transaction ${transaction.id}`,
        error,
      );
      // Don't throw error to prevent webhook retries
      // The webhook will be retried by the payment provider
    }
  }
  getAvailableProviders() {
    return this.paymentProviderFactory.getAvailableProviders();
  }

  /**
   * Get providers by criteria
   */
  getProvidersByCriteria(
    currency?: string,
    paymentMethod?: PaymentMethod,
    region?: string,
  ) {
    return this.paymentProviderFactory.getProvidersByCriteria(
      currency,
      paymentMethod,
      region,
    );
  }
}
