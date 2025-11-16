import {
  PaymentMethod,
  PaymentStatus,
} from '../../domain/entities/payment-transaction.entity';
import { RefundStatus } from '../../domain/entities/refund.entity';

export interface PaymentMetadata {
  userId: string;
  walletId: string;
  paymentTransactionId: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  userEmail: string;
  [key: string]: any;
}

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

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  gatewayResponse?: any;
}

export interface WebhookEvent {
  type: string;
  data: any;
  paymentId: string;
}

export interface IPaymentProvider {
  readonly name: string;
  readonly providerCode: string;
  readonly supportedMethods: readonly PaymentMethod[];
  readonly supportedCurrencies: readonly string[];
  readonly supportedRegions?: readonly string[];
  createPaymentIntent(
    amount: number,
    currency: string,
    metadata: PaymentMetadata,
  ): Promise<PaymentIntentResult>;
  confirmPayment(
    paymentId: string,
    confirmationData?: any,
  ): Promise<PaymentResult>;
  refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string,
  ): Promise<RefundResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  verifyWebhookSignature(payload: any, signature: string): boolean;
  handleWebhook(payload: any, signature: string): Promise<WebhookEvent>;
}
