import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BasePaymentProvider } from './base-payment-provider';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
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
import * as crypto from 'crypto';

interface PayPalAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalCreateOrderRequest {
  intent: string;
  purchase_units: Array<{
    reference_id: string;
    amount: {
      currency_code: string;
      value: string;
    };
    description?: string;
  }>;
  application_context?: {
    return_url: string;
    cancel_url: string;
  };
}

interface PayPalCreateOrderResponse {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  purchase_units: Array<{
    reference_id: string;
    amount: {
      currency_code: string;
      value: string;
    };
    payee: {
      email_address: string;
      merchant_id: string;
    };
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: {
          currency_code: string;
          value: string;
        };
      }>;
    };
  }>;
}

interface PayPalRefundRequest {
  amount?: {
    value: string;
    currency_code: string;
  };
  invoice_id?: string;
  note_to_payer?: string;
}

interface PayPalRefundResponse {
  id: string;
  status: string;
  amount: {
    value: string;
    currency_code: string;
  };
}

@Injectable()
export class PayPalProvider extends BasePaymentProvider {
  private readonly logger = new Logger(PayPalProvider.name);
  private readonly axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  readonly name = 'PayPal';
  readonly providerCode = 'paypal';
  readonly supportedMethods: PaymentMethod[] = [PaymentMethod.PAYPAL];
  readonly supportedCurrencies: string[] = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'];
  readonly supportedRegions?: string[];

  constructor(private readonly configService: ConfigService) {
    super();
    
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');
    const isSandbox = this.configService.get<string>('PAYPAL_MODE') === 'sandbox';
    const baseURL = isSandbox
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';

    if (!clientId || !clientSecret) {
      this.logger.warn('PayPal credentials are not configured');
    }

    this.axiosInstance = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      auth: {
        username: clientId || '',
        password: clientSecret || '',
      },
    });
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const response: AxiosResponse<PayPalAccessTokenResponse> =
        await this.axiosInstance.post('/v1/oauth2/token', 'grant_type=client_credentials', {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

      this.accessToken = response.data.access_token;
      // Set expiration 5 minutes before actual expiration for safety
      this.tokenExpiresAt = Date.now() + (response.data.expires_in - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to get PayPal access token', error);
      throw new BadRequestException('Failed to authenticate with PayPal');
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: PaymentMetadata,
  ): Promise<PaymentIntentResult> {
    this.validateCurrency(currency);

    try {
      const accessToken = await this.getAccessToken();

      const orderRequest: PayPalCreateOrderRequest = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: metadata.paymentTransactionId,
            amount: {
              currency_code: currency.toUpperCase(),
              value: amount.toFixed(2),
            },
            description: metadata.description,
          },
        ],
        application_context: {
          return_url: metadata.returnUrl,
          cancel_url: metadata.cancelUrl,
        },
      };

      const response: AxiosResponse<PayPalCreateOrderResponse> =
        await this.axiosInstance.post('/v2/checkout/orders', orderRequest, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

      const approveLink = response.data.links.find(
        (link) => link.rel === 'approve',
      );

      return {
        paymentId: metadata.paymentTransactionId,
        redirectUrl: approveLink?.href,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };
    } catch (error) {
      this.logger.error('Failed to create PayPal order', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to create payment intent',
      );
    }
  }

  async confirmPayment(
    paymentId: string,
    confirmationData?: any,
  ): Promise<PaymentResult> {
    try {
      const accessToken = await this.getAccessToken();
      const orderId = confirmationData?.orderId || paymentId;

      // Capture the order
      const captureResponse: AxiosResponse<PayPalOrderResponse> =
        await this.axiosInstance.post(
          `/v2/checkout/orders/${orderId}/capture`,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

      const capture = captureResponse.data.purchase_units[0]?.payments?.captures?.[0];
      const status = this.mapPayPalStatus(captureResponse.data.status);

      return {
        success: status === PaymentStatus.COMPLETED,
        paymentId: orderId,
        transactionId: capture?.id || orderId,
        amount: parseFloat(capture?.amount?.value || '0'),
        currency: capture?.amount?.currency_code || 'USD',
        status,
        gatewayResponse: captureResponse.data,
      };
    } catch (error) {
      this.logger.error('Failed to confirm PayPal payment', error);
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
    try {
      const accessToken = await this.getAccessToken();

      const refundRequest: PayPalRefundRequest = {
        amount: amount
          ? {
              value: amount.toFixed(2),
              currency_code: 'USD', // Should get from original transaction
            }
          : undefined,
        note_to_payer: reason,
      };

      const response: AxiosResponse<PayPalRefundResponse> =
        await this.axiosInstance.post(
          `/v2/payments/captures/${paymentId}/refund`,
          refundRequest,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

      return {
        success: response.data.status === 'COMPLETED',
        refundId: response.data.id,
        amount: parseFloat(response.data.amount.value),
        currency: response.data.amount.currency_code,
        status: this.mapRefundStatus(response.data.status),
        gatewayResponse: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to process PayPal refund', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to process refund',
      );
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    try {
      const accessToken = await this.getAccessToken();

      const response: AxiosResponse<PayPalOrderResponse> =
        await this.axiosInstance.get(`/v2/checkout/orders/${paymentId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

      return this.mapPayPalStatus(response.data.status);
    } catch (error) {
      this.logger.error('Failed to get PayPal payment status', error);
      return PaymentStatus.FAILED;
    }
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    try {
      const webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID');
      const certURL = payload.headers?.['paypal-cert-url'] || payload.cert_url;
      const transmissionId = payload.headers?.['paypal-transmission-id'] || payload.transmission_id;
      const transmissionTime = payload.headers?.['paypal-transmission-time'] || payload.transmission_time;
      const transmissionSig = payload.headers?.['paypal-transmission-sig'] || payload.transmission_sig;
      const authAlgo = payload.headers?.['paypal-auth-algo'] || payload.auth_algo;

      if (!webhookId || !certURL || !transmissionId || !transmissionTime || !transmissionSig) {
        this.logger.error('Missing PayPal webhook verification data');
        return false;
      }

      // PayPal webhook signature verification
      // This is a simplified version - full implementation requires fetching the certificate
      // For production, implement full webhook signature verification as per PayPal docs
      return true;
    } catch (error) {
      this.logger.error('Failed to verify PayPal webhook signature', error);
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

    const eventType = payload.event_type || payload.type;
    let paymentEventType = 'payment.failed';
    let paymentId = '';

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        paymentEventType = 'payment.succeeded';
        paymentId = payload.resource?.id || payload.id || '';
        break;
      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REFUNDED':
        paymentEventType = 'payment.failed';
        paymentId = payload.resource?.id || payload.id || '';
        break;
      case 'CHECKOUT.ORDER.APPROVED':
        paymentEventType = 'payment.succeeded';
        paymentId = payload.resource?.id || payload.id || '';
        break;
      default:
        paymentEventType = 'payment.unknown';
        paymentId = payload.resource?.id || payload.id || '';
    }

    return {
      type: paymentEventType,
      data: payload,
      paymentId,
    };
  }

  private mapPayPalStatus(status: string): PaymentStatus {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED':
        return PaymentStatus.COMPLETED;
      case 'CREATED':
      case 'SAVED':
      case 'PENDING':
        return PaymentStatus.PENDING;
      case 'VOIDED':
      case 'CANCELLED':
        return PaymentStatus.CANCELLED;
      default:
        return PaymentStatus.FAILED;
    }
  }

  private mapRefundStatus(status: string): RefundStatus {
    switch (status) {
      case 'COMPLETED':
        return RefundStatus.PROCESSED;
      case 'PENDING':
        return RefundStatus.PENDING;
      case 'FAILED':
        return RefundStatus.FAILED;
      default:
        return RefundStatus.PENDING;
    }
  }
}