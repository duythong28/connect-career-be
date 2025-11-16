import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { BasePaymentProvider } from './base-payment-provider';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../domain/entities/payment-transaction.entity';
import {
  PaymentIntentResult,
  PaymentMetadata,
  PaymentResult,
  RefundResult,
  WebhookEvent,
} from './payment-provider.interface';
import {
  MoMoAxiosRequestConfig,
  MoMoConfirmPaymentData,
  MoMoCreatePaymentRequest,
  MoMoCreatePaymentResponse,
  MoMoQueryPaymentRequest,
  MoMoQueryPaymentResponse,
  MoMoWebhookPayload,
} from '../types/momo.type';

@Injectable()
export class MoMoProvider extends BasePaymentProvider {
  private readonly logger = new Logger(MoMoProvider.name);
  readonly name = 'MoMo';
  readonly providerCode = 'momo';
  readonly supportedMethods = [PaymentMethod.MOMO];
  readonly supportedCurrencies = ['VND'];
  readonly supportedRegions = ['VN'];

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: PaymentMetadata,
  ): Promise<PaymentIntentResult> {
    this.validateCurrency(currency);

    const partnerCode = this.configService.get<string>('PARTNER_CODE_MOMO');
    const accessKey = this.configService.get<string>('ACCESS_KEY_MOMO');
    const secretKey = this.configService.get<string>('SECRET_KEY_MOMO');
    const redirectUrl =
      metadata.returnUrl ||
      this.configService.get<string>('REDIRECT_URL_PAYMENT');
    const ipnUrl =
      metadata.notifyUrl || this.configService.get<string>('IPN_URL_MOMO');

    if (!partnerCode || !accessKey || !secretKey) {
      throw new BadRequestException('MoMo configuration is missing');
    }

    if (!redirectUrl || !ipnUrl) {
      throw new BadRequestException('MoMo URLs configuration is missing');
    }

    try {
      const requestId = `${partnerCode}${new Date().getTime()}`;
      const orderId = metadata.paymentTransactionId;
      const orderInfo =
        metadata.description || `Thanh toán đơn hàng ${orderId}`;
      const requestType = 'captureWallet';
      const extraData = 'bookstore';

      const rawSignature =
        'accessKey=' +
        accessKey +
        '&amount=' +
        amount +
        '&extraData=' +
        extraData +
        '&ipnUrl=' +
        ipnUrl +
        '&orderId=' +
        orderId +
        '&orderInfo=' +
        orderInfo +
        '&partnerCode=' +
        partnerCode +
        '&redirectUrl=' +
        redirectUrl +
        '&requestId=' +
        requestId +
        '&requestType=' +
        requestType;

      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');

      const requestBody: MoMoCreatePaymentRequest = {
        partnerCode,
        accessKey,
        requestId,
        amount,
        orderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        extraData,
        requestType,
        signature,
        lang: 'en',
      };

      const options: MoMoAxiosRequestConfig = {
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(
            JSON.stringify(requestBody),
            'utf8',
          ),
        },
        method: 'POST',
        url: 'https://test-payment.momo.vn/v2/gateway/api/create',
        data: JSON.stringify(requestBody),
      };

      const response: AxiosResponse<MoMoCreatePaymentResponse> =
        await axios(options);

      if (response.data.resultCode !== 0) {
        throw new BadRequestException(
          `MoMo payment creation failed: ${response.data.message}`,
        );
      }

      return {
        paymentId: orderId,
        paymentUrl: response.data.payUrl,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      };
    } catch (error) {
      this.logger.error('Failed to create MoMo payment intent', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create payment url');
    }
  }

  async confirmPayment(
    paymentId: string,
    confirmationData?: MoMoConfirmPaymentData,
  ): Promise<PaymentResult> {
    try {
      const status = await this.getPaymentStatus(paymentId);

      return {
        success: status === PaymentStatus.COMPLETED,
        paymentId,
        transactionId: confirmationData?.transactionId || paymentId,
        amount: confirmationData?.amount || 0,
        currency: 'VND',
        status,
        gatewayResponse: confirmationData,
      };
    } catch (error) {
      this.logger.error('Failed to confirm MoMo payment', error);
      throw new BadRequestException('Failed to confirm payment');
    }
  }

  async refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string,
  ): Promise<RefundResult> {
    // MoMo refund implementation would go here
    this.logger.warn('MoMo refund not yet implemented');
    throw new BadRequestException('Refund not yet implemented for MoMo');
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const partnerCode = this.configService.get<string>('partner_code_momo');
    const accessKey = this.configService.get<string>('access_key_momo');
    const secretKey = this.configService.get<string>('secret_key_momo');

    if (!partnerCode || !accessKey || !secretKey) {
      this.logger.error('MoMo configuration is missing');
      return PaymentStatus.FAILED;
    }

    try {
      const requestId = `${partnerCode}${new Date().getTime()}`;
      const lang = 'en';

      const data = `accessKey=${accessKey}&orderId=${paymentId}&partnerCode=${partnerCode}&requestId=${requestId}`;
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(data)
        .digest('hex');

      const requestBody: MoMoQueryPaymentRequest = {
        partnerCode,
        requestId,
        orderId: paymentId,
        signature,
        lang,
      };

      const options: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
        url: 'https://test-payment.momo.vn/v2/gateway/api/query',
        data: JSON.stringify(requestBody),
      };

      const response: AxiosResponse<MoMoQueryPaymentResponse> =
        await axios(options);
      const resultCode = response.data.resultCode;

      if (resultCode === 0) {
        return PaymentStatus.COMPLETED;
      } else if (resultCode === 1000 || resultCode === 1001) {
        return PaymentStatus.PENDING;
      } else {
        return PaymentStatus.FAILED;
      }
    } catch (error) {
      this.logger.error('Failed to get MoMo payment status', error);
      return PaymentStatus.FAILED;
    }
  }

  verifyWebhookSignature(
    payload: MoMoWebhookPayload,
    signature: string,
  ): boolean {
    // MoMo webhook signature verification
    // The original code mentioned checking signature would be implemented later
    // This is a placeholder - implement proper signature verification
    return payload.signature === signature;
  }

  async handleWebhook(
    payload: MoMoWebhookPayload,
    signature: string,
  ): Promise<WebhookEvent> {
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const { orderId, resultCode } = payload;

    let eventType: string = 'payment.failed';
    if (resultCode === 0) {
      eventType = 'payment.succeeded';
    }

    return {
      type: eventType,
      data: payload,
      paymentId: orderId,
    };
  }
}
