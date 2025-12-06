import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../domain/entities/payment-transaction.entity';
import {
  IPaymentProvider,
  PaymentIntentResult,
  PaymentMetadata,
  PaymentResult,
  RefundResult,
  WebhookEvent,
} from './payment-provider.interface';
import { IsObject, IsOptional } from 'class-validator';

export abstract class BasePaymentProvider implements IPaymentProvider {
  abstract readonly name: string;
  abstract readonly providerCode: string;
  abstract readonly supportedMethods: PaymentMethod[];
  abstract readonly supportedCurrencies: string[];
  abstract readonly supportedRegions?: string[];
  abstract createPaymentIntent(
    amount: number,
    currency: string,
    metadata: PaymentMetadata,
  ): Promise<PaymentIntentResult>;
  abstract confirmPayment(
    paymentId: string,
    confirmationData?: any,
  ): Promise<PaymentResult>;
  abstract refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string,
  ): Promise<RefundResult>;
  abstract getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  abstract verifyWebhookSignature(payload: any, signature: string): boolean;
  abstract handleWebhook(
    payload: any,
    signature: string,
  ): Promise<WebhookEvent>;
  protected validateCurrency(currency: string): void {
    if (!this.supportedCurrencies.includes(currency)) {
      throw new Error(`Currency ${currency} is not supported by ${this.name}`);
    }
  }
}

export class PaymentStatusResponseDto {
  @ApiProperty()
  paymentId: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  data?: any;
}
