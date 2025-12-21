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
  readonly supportedCurrencies: string[] = [
    'USD',
    'EUR',
    'GBP',
    'VND',
    'SGD',
    'JPY',
    'AUD',
  ];
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

  verifyWebhookSignature(payload: any, signature: string): boolean {
    return true;
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

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    try {
      // Create checkout session instead of payment intent
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: metadata.description,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: metadata.returnUrl,
        cancel_url: metadata.cancelUrl,
        metadata: {
          paymentTransactionId: metadata.paymentTransactionId,
          userId: metadata.userId,
          walletId: metadata.walletId,
          description: metadata.description,
          userEmail: metadata.userEmail,
        },
      });

      this.logger.log(
        `Checkout session created: ${session.id} for transaction ${metadata.paymentTransactionId}`,
      );

      return {
        paymentId: metadata.paymentTransactionId,
        redirectUrl: session.url || undefined,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe checkout session', error);
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Failed to create checkout session',
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
      // paymentId could be our transaction ID, session ID, or payment intent ID
      // First, try to find by session metadata (our transaction ID)
      let session: Stripe.Checkout.Session | null = null;
      let paymentIntent: Stripe.PaymentIntent | null = null;

      try {
        // Try to retrieve as checkout session first
        session = await this.stripe.checkout.sessions.retrieve(paymentId);

        // If session found, get the payment intent from it
        if (session.payment_intent) {
          const paymentIntentId =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent.id;
          paymentIntent =
            await this.stripe.paymentIntents.retrieve(paymentIntentId);
        }
      } catch {
        // If not a session, try searching by metadata (our transaction ID)
        try {
          const sessions = await this.stripe.checkout.sessions.list({
            limit: 1,
          });
          session =
            sessions.data.find(
              (s) => s.metadata?.paymentTransactionId === paymentId,
            ) || null;

          if (session?.payment_intent) {
            const paymentIntentId =
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent.id;
            paymentIntent =
              await this.stripe.paymentIntents.retrieve(paymentIntentId);
          }
        } catch {
          // Finally, try as payment intent ID
          try {
            paymentIntent =
              await this.stripe.paymentIntents.retrieve(paymentId);
          } catch {
            throw new BadRequestException(
              `Payment not found for ID: ${paymentId}`,
            );
          }
        }
      }

      if (!paymentIntent) {
        throw new BadRequestException(
          `Payment intent not found for ID: ${paymentId}`,
        );
      }

      const status = this.mapStripeStatus(paymentIntent.status);
      const charge = paymentIntent.latest_charge;
      const chargeId = typeof charge === 'string' ? charge : charge?.id;

      return {
        success: status === PaymentStatus.COMPLETED,
        paymentId:
          session?.metadata?.paymentTransactionId ||
          paymentIntent.metadata?.paymentTransactionId ||
          paymentIntent.id,
        transactionId: chargeId || paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status,
        gatewayResponse: paymentIntent,
      };
    } catch (error) {
      this.logger.error('Failed to confirm Stripe payment', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
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
      // First, try to get the checkout session to find payment intent
      let paymentIntentId: string | undefined;

      try {
        const session = await this.stripe.checkout.sessions.retrieve(paymentId);
        if (session.payment_intent) {
          paymentIntentId =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent.id;
        }
      } catch {
        // If not a session, try searching by metadata
        try {
          const sessions = await this.stripe.checkout.sessions.list({
            limit: 100,
          });
          const foundSession = sessions.data.find(
            (s) => s.metadata?.paymentTransactionId === paymentId,
          );

          if (foundSession?.payment_intent) {
            paymentIntentId =
              typeof foundSession.payment_intent === 'string'
                ? foundSession.payment_intent
                : foundSession.payment_intent.id;
          }
        } catch {
          // Assume paymentId is a payment intent ID
          paymentIntentId = paymentId;
        }
      }

      if (!paymentIntentId) {
        throw new BadRequestException(
          'Unable to determine payment intent ID for refund',
        );
      }

      // Get the payment intent to find the charge
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);
      const charge = paymentIntent.latest_charge;
      const chargeId = typeof charge === 'string' ? charge : charge?.id;

      if (!chargeId) {
        throw new BadRequestException('No charge found for this payment');
      }

      const refund = await this.stripe.refunds.create({
        charge: chargeId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: reason as Stripe.RefundCreateParams.Reason | undefined,
      });

      this.logger.log(`Refund created: ${refund.id} for charge ${chargeId}`);

      return {
        success: refund.status === 'succeeded',
        refundId: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency.toUpperCase(),
        status: refund.status as RefundStatus,
        gatewayResponse: refund,
      };
    } catch (error) {
      this.logger.error('Failed to process Stripe refund', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
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
      // Try to retrieve as checkout session first
      try {
        const session = await this.stripe.checkout.sessions.retrieve(paymentId);

        if (session.payment_status === 'paid') {
          return PaymentStatus.COMPLETED;
        } else if (session.payment_status === 'unpaid') {
          return PaymentStatus.PENDING;
        } else {
          return PaymentStatus.FAILED;
        }
      } catch {
        // If not a session, try searching by metadata (our transaction ID)
        try {
          const sessions = await this.stripe.checkout.sessions.list({
            limit: 100,
          });
          const foundSession = sessions.data.find(
            (s) => s.metadata?.paymentTransactionId === paymentId,
          );

          if (foundSession) {
            if (foundSession.payment_status === 'paid') {
              return PaymentStatus.COMPLETED;
            } else if (foundSession.payment_status === 'unpaid') {
              return PaymentStatus.PENDING;
            } else {
              return PaymentStatus.FAILED;
            }
          }
        } catch {
          // Finally, try as payment intent ID
          try {
            const paymentIntent =
              await this.stripe.paymentIntents.retrieve(paymentId);
            return this.mapStripeStatus(paymentIntent.status);
          } catch {
            this.logger.warn(`Payment not found for ID: ${paymentId}`);
            return PaymentStatus.FAILED;
          }
        }
      }

      return PaymentStatus.FAILED;
    } catch (error) {
      this.logger.error('Failed to get Stripe payment status', error);
      return PaymentStatus.FAILED;
    }
  }

  async handleWebhook(payload: any, signature: string): Promise<WebhookEvent> {
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = payload as Stripe.Event;
    let eventType = 'payment.unknown';
    let paymentId = '';

    try {
      switch (event.type) {
        // ... existing checkout.session and payment_intent cases ...

        // Charge events
        case 'charge.refunded':
          eventType = 'payment.refunded';
          const charge = event.data.object as Stripe.Charge;
          if (charge.payment_intent) {
            const intentId =
              typeof charge.payment_intent === 'string'
                ? charge.payment_intent
                : charge.payment_intent.id;
            // Try to get payment intent to find transaction ID
            try {
              const intent =
                await this.stripe.paymentIntents.retrieve(intentId);
              paymentId = intent.metadata?.paymentTransactionId || intentId;
            } catch {
              paymentId = intentId;
            }
          } else {
            paymentId = charge.id;
          }
          break;

        // Refund-specific events (more detailed than charge.refunded)
        case 'charge.refund.updated':
          eventType = 'payment.refunded';
          const refundUpdate = event.data.object as Stripe.Refund;
          if (refundUpdate.charge) {
            const chargeId =
              typeof refundUpdate.charge === 'string'
                ? refundUpdate.charge
                : refundUpdate.charge.id;
            try {
              const chargeObj = await this.stripe.charges.retrieve(chargeId);
              if (chargeObj.payment_intent) {
                const intentId =
                  typeof chargeObj.payment_intent === 'string'
                    ? chargeObj.payment_intent
                    : chargeObj.payment_intent.id;
                const intent =
                  await this.stripe.paymentIntents.retrieve(intentId);
                paymentId = intent.metadata?.paymentTransactionId || intentId;
              } else {
                paymentId = chargeId;
              }
            } catch {
              paymentId = chargeId;
            }
          } else {
            paymentId = refundUpdate.id;
          }
          break;

        default:
          this.logger.warn(`Unhandled webhook event type: ${event.type}`);
          paymentId = (event.data.object as any).id || '';
      }

      this.logger.log(
        `Webhook event processed: ${eventType} for payment ${paymentId}`,
      );

      return {
        type: eventType,
        data: event.data.object,
        paymentId,
      };
    } catch (error) {
      this.logger.error('Failed to handle Stripe webhook', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to handle webhook',
      );
    }
  }
  async getCheckoutSession(
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      this.logger.error('Failed to get Stripe checkout session', error);
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Failed to get checkout session',
      );
    }
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
      default:
        return PaymentStatus.FAILED;
    }
  }
}
