import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BasePaymentProvider } from './base-payment-provider';
import Stripe from 'stripe';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../domain/entities/payment-transaction.entity';
import {
  PaymentMetadata,
  PaymentIntentResult,
  PaymentResult,
  RefundResult,
  WebhookEvent,
} from './payment-provider.interface';
import { RefundStatus } from '../../domain/entities/refund.entity';

@Injectable()
export class StripeProvider extends BasePaymentProvider {
  private readonly logger = new Logger(StripeProvider.name);
  private stripe: Stripe;
  
  readonly name = 'Stripe';
  readonly providerCode = 'stripe';
  readonly supportedMethods: PaymentMethod[] = [
    PaymentMethod.CREDIT_CARD,
    PaymentMethod.DEBIT_CARD,
    PaymentMethod.APPLE_PAY,
    PaymentMethod.GOOGLE_PAY,
  ];
  readonly supportedCurrencies: string[] = ['USD', 'EUR', 'GBP', 'VND', 'SGD', 'JPY', 'AUD'];
  readonly supportedRegions?: string[];

  constructor(private readonly configService: ConfigService) {
    super();
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      this.logger.warn('Stripe secret key is not configured');
    } else {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-10-29.clover',
      });
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: PaymentMetadata,
  ): Promise<PaymentIntentResult> {
    this.validateCurrency(currency);

    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          userId: metadata.userId,
          walletId: metadata.walletId,
          paymentTransactionId: metadata.paymentTransactionId,
          description: metadata.description,
        },
        payment_method_types: ['card'],
        description: metadata.description,
      });

      return {
        paymentId: metadata.paymentTransactionId,
        clientSecret: paymentIntent.client_secret || undefined,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe payment intent', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to create payment intent',
      );
    }
  }

  async confirmPayment(
    paymentId: string,
    confirmationData?: any,
  ): Promise<PaymentResult> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      // paymentId here is the payment intent ID from Stripe
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);

      const status = this.mapStripeStatus(paymentIntent.status);

      return {
        success: status === PaymentStatus.COMPLETED,
        paymentId: paymentIntent.id,
        transactionId: paymentIntent.latest_charge as string || paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status,
        gatewayResponse: paymentIntent,
      };
    } catch (error) {
      this.logger.error('Failed to confirm Stripe payment', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to confirm payment',
      );
    }
  }

  async refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string,
  ): Promise<RefundResult> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      // paymentId should be the charge ID or payment intent ID
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
        reason: reason as Stripe.RefundCreateParams.Reason | undefined,
      });

      return {
        success: refund.status === 'succeeded',
        refundId: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency.toUpperCase(),
        status: this.mapRefundStatus(refund.status as string),
        gatewayResponse: refund,
      };
    } catch (error) {
      this.logger.error('Failed to process Stripe refund', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to process refund',
      );
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);
      return this.mapStripeStatus(paymentIntent.status);
    } catch (error) {
      this.logger.error('Failed to get Stripe payment status', error);
      return PaymentStatus.FAILED;
    }
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!this.stripe) {
      this.logger.error('Stripe is not configured');
      return false;
    }

    try {
      const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
      if (!webhookSecret) {
        this.logger.error('Stripe webhook secret is not configured');
        return false;
      }

      this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return true;
    } catch (error) {
      this.logger.error('Failed to verify Stripe webhook signature', error);
      return false;
    }
  }

  async handleWebhook(
    payload: any,
    signature: string,
  ): Promise<WebhookEvent> {
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = payload as Stripe.Event;
    let eventType = 'payment.failed';
    let paymentId = '';

    switch (event.type) {
      case 'payment_intent.succeeded':
        eventType = 'payment.succeeded';
        paymentId = (event.data.object as Stripe.PaymentIntent).id;
        break;
      case 'payment_intent.payment_failed':
        eventType = 'payment.failed';
        paymentId = (event.data.object as Stripe.PaymentIntent).id;
        break;
      case 'payment_intent.canceled':
        eventType = 'payment.cancelled';
        paymentId = (event.data.object as Stripe.PaymentIntent).id;
        break;
      default:
        eventType = 'payment.unknown';
        paymentId = (event.data.object as any).id || '';
    }

    return {
      type: eventType,
      data: event.data.object,
      paymentId,
    };
  }

  private mapStripeStatus(status: string): PaymentStatus {
    switch (status) {
      case 'succeeded':
        return PaymentStatus.COMPLETED;
      case 'processing':
      case 'requires_action':
      case 'requires_confirmation':
      case 'requires_payment_method':
      case 'requires_capture':
        return PaymentStatus.PROCESSING;
      case 'canceled':
        return PaymentStatus.CANCELLED;
      case 'requires_capture':
        return PaymentStatus.PENDING;
      default:
        return PaymentStatus.FAILED;
    }
  }

  private mapRefundStatus(status: string): RefundStatus {
    switch (status) {
      case 'succeeded':
        return RefundStatus.PROCESSED;
      case 'pending':
        return RefundStatus.PENDING;
      case 'failed':
        return RefundStatus.FAILED;
      default:
        return RefundStatus.PENDING;
    }
  }
}