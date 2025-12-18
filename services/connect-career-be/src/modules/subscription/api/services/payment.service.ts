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
import { UserWallet } from '../../domain/entities/user-wallet.entity';
import { WalletService } from './wallet.service';
import {
  PaymentMetadata,
  WebhookEvent,
} from '../../infrastructure/payment-providers/payment-provider.interface';
import { ConfigService } from '@nestjs/config';
import { MoMoProvider } from '../../infrastructure/payment-providers/momo.provider';
import { PaymentProviderFactory } from '../../infrastructure/payment-providers/payment-provider.factory';
import { User } from 'src/modules/identity/domain/entities';

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
    private walletService: WalletService,
    private configService: ConfigService,
    private paymentProviderFactory: PaymentProviderFactory,
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

    if (
      !this.paymentProviderFactory.validateProviderCurrency(provider, currency)
    ) {
      const supportedCurrencies = paymentProvider.supportedCurrencies;
      throw new BadRequestException(
        `Currency '${currency}' is not supported by provider '${provider}'. Supported currencies: ${supportedCurrencies.join(', ')}`,
      );
    }

    const transaction = this.paymentTransactionRepository.create({
      walletId: wallet.id,
      userId,
      provider,
      providerPaymentId: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentMethod: paymentMethod as PaymentMethod,
      amount,
      currency,
      status: PaymentStatus.PENDING,
      type: PaymentType.TOP_UP,
      description: `Wallet top-up of ${amount} ${currency}`,
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
        description: `Wallet top-up of ${amount} ${currency}`,
        returnUrl: `${frontendUrl}/wallet/top-up/return`,
        cancelUrl: `${frontendUrl}/wallet/top-up/cancel`,
        notifyUrl: `${apiUrl}/v1/payments/${provider.toLowerCase()}/webhook`,
        userEmail: user?.email || '',
      };

      const intentResult: PaymentIntentResult =
        await paymentProvider.createPaymentIntent(amount, currency, metadata);

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
    // Find the payment transaction
    const transaction = await this.paymentTransactionRepository.findOne({
      where: {
        providerPaymentId: webhookEvent.paymentId,
        provider: provider.toLowerCase(),
      },
      relations: ['wallet'],
    });

    if (!transaction) {
      this.logger.warn(
        `Payment transaction not found for provider: ${provider}, paymentId: ${webhookEvent.paymentId}`,
      );
      return;
    }

    try {
      // Update transaction status based on webhook event
      if (webhookEvent.type === 'payment.succeeded') {
        transaction.status = PaymentStatus.COMPLETED;
        transaction.completedAt = new Date();
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
        }

        await this.paymentTransactionRepository.save(transaction);

        // Credit wallet (only if not already credited)
        const wallet = await this.walletService.getOrCreateWallet(
          transaction.userId,
        );
        if (wallet.id === transaction.walletId) {
          await this.walletService.creditWallet(
            transaction.walletId,
            transaction.amount,
            `Top-up via ${provider}`,
            { paymentTransactionId: transaction.id },
          );
        }

        this.logger.log(
          `Payment succeeded via webhook: ${transaction.id} for user ${transaction.userId}`,
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
