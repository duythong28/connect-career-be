import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { BasePaymentProvider } from './base-payment-provider';
import {
  PaymentMethod,
  PaymentStatus,
  PaymentTransaction,
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
  MoMoRefundRequest,
  MoMoRefundResponse,
  MoMoWebhookPayload,
} from '../types/momo.type';
import { Refund, RefundStatus } from '../../domain/entities/refund.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class MoMoProvider extends BasePaymentProvider {
  private readonly logger = new Logger(MoMoProvider.name);
  readonly name = 'MoMo';
  readonly providerCode = 'momo';
  readonly supportedMethods = [PaymentMethod.MOMO];
  readonly supportedCurrencies = ['VND'];
  readonly supportedRegions = ['VN'];

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PaymentTransaction)
    private paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
  ) {
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
      const extraData = 'topup-connect-career';

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
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
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
    const partnerCode = this.configService.get<string>('PARTNER_CODE_MOMO');
    const accessKey = this.configService.get<string>('ACCESS_KEY_MOMO');
    const secretKey = this.configService.get<string>('SECRET_KEY_MOMO');

    if (!partnerCode || !accessKey || !secretKey) {
      throw new BadRequestException('MoMo configuration is missing');
    }

    // paymentId is your orderId. We need the stored transId.
    const transaction = await this.paymentTransactionRepository.findOne({
      where: { providerPaymentId: paymentId, provider: this.providerCode },
    });

    if (!transaction) {
      throw new BadRequestException(
        `Payment transaction not found for orderId ${paymentId}`,
      );
    }

    const transId = transaction.providerTransactionId
      ? Number(transaction.providerTransactionId)
      : undefined;

    if (!transId) {
      throw new BadRequestException(
        'Cannot refund: missing MoMo transaction id (transId). Ensure webhook stored it.',
      );
    }

    const refundAmount = Math.round(amount ?? Number(transaction.amount));
    if (refundAmount <= 0) {
      throw new BadRequestException('Refund amount must be greater than 0');
    }

    try {
      const requestId = `${partnerCode}${Date.now()}`;
      const orderId = `${paymentId}-refund-${Date.now()}`; // refund orderId must differ
      const description = reason ?? 'Refund';
      const lang = 'en';

      const rawSignature =
        'accessKey=' +
        accessKey +
        '&amount=' +
        refundAmount +
        '&description=' +
        description +
        '&orderId=' +
        orderId +
        '&partnerCode=' +
        partnerCode +
        '&requestId=' +
        requestId +
        '&transId=' +
        transId;

      console.log(rawSignature);
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');

      const requestBody: MoMoRefundRequest = {
        partnerCode,
        orderId,
        requestId,
        amount: refundAmount,
        transId,
        lang,
        description,
        signature,
      };

      console.log(JSON.stringify(requestBody));

      const options: AxiosRequestConfig = {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        url: 'https://test-payment.momo.vn/v2/gateway/api/refund',
        data: JSON.stringify(requestBody),
      };

      const response: AxiosResponse<MoMoRefundResponse> = await axios(options);

      if (response.data.resultCode !== 0) {
        throw new BadRequestException(
          `MoMo refund failed: ${response.data.message}`,
        );
      }

      const refund = this.refundRepository.create({
        userId: transaction.userId,
        paymentTransactionId: transaction.id,
        amount: refundAmount,
        currency: 'VND',
        status: RefundStatus.PROCESSED,
        providerRefundId: response.data.orderId ?? orderId,
        metadata: response.data,
      });
      await this.refundRepository.save(refund);

      // Update transaction (if full refund)
      if (refundAmount >= Number(transaction.amount)) {
        transaction.status = PaymentStatus.REFUNDED;
      }
      transaction.providerResponse = {
        ...transaction.providerResponse,
        refund: response.data,
      };
      await this.paymentTransactionRepository.save(transaction);

      return {
        success: true,
        refundId: refund.id,
        amount: refundAmount,
        currency: 'VND',
        status: RefundStatus.PROCESSED,
        gatewayResponse: response.data,
      };
    } catch (error) {
      const resp = (error as any).response;
      const config = (error as any).config;
      this.logger.error('Failed to refund MoMo payment', resp?.data ?? error);
      this.logger.debug('Request payload:', config?.data);
      throw new BadRequestException('Failed to refund payment');
    }
  }

  // Helper to get transId
  private async queryPayment(
    orderId: string,
  ): Promise<MoMoQueryPaymentResponse> {
    const partnerCode = this.configService.get<string>('PARTNER_CODE_MOMO');
    const accessKey = this.configService.get<string>('ACCESS_KEY_MOMO');
    const secretKey = this.configService.get<string>('SECRET_KEY_MOMO');

    if (!partnerCode || !accessKey || !secretKey) {
      throw new BadRequestException('MoMo configuration is missing');
    }

    const requestId = `${partnerCode}${Date.now()}`;
    const lang = 'en';
    const data = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=${partnerCode}&requestId=${requestId}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(data)
      .digest('hex');

    const requestBody: MoMoQueryPaymentRequest = {
      partnerCode,
      requestId,
      orderId,
      signature,
      lang,
    };

    const options: AxiosRequestConfig = {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      url: 'https://test-payment.momo.vn/v2/gateway/api/query',
      data: JSON.stringify(requestBody),
    };

    const response: AxiosResponse<MoMoQueryPaymentResponse> =
      await axios(options);
    return response.data;
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

    const { orderId, resultCode, transId, message } = payload;

    // Try multiple ways to find transaction
    let transaction = await this.paymentTransactionRepository.findOne({
      where: {
        providerPaymentId: orderId,
        provider: this.providerCode,
      },
    });

    // If not found, try finding by transaction ID directly (orderId = transaction.id)
    if (!transaction) {
      transaction = await this.paymentTransactionRepository.findOne({
        where: {
          id: orderId,
          provider: this.providerCode,
        },
      });
    }

    if (transaction) {
      // Update providerPaymentId if it's not set yet
      if (
        !transaction.providerPaymentId ||
        transaction.providerPaymentId.startsWith('pending_')
      ) {
        transaction.providerPaymentId = orderId;
      }

      // Store transId and response, but DON'T update status here
      // Let payment.service.processWebhookEvent handle status update and wallet credit
      transaction.providerTransactionId = String(transId);
      transaction.providerResponse = payload;

      // Only save the transId and response, not the status
      await this.paymentTransactionRepository.save(transaction);

      this.logger.log(
        `MoMo webhook received: transaction ${transaction.id}, orderId: ${orderId}, resultCode: ${resultCode}, transId: ${transId}`,
      );
    } else {
      this.logger.warn(`Payment transaction not found for orderId ${orderId}`);
    }

    const eventType = resultCode === 0 ? 'payment.succeeded' : 'payment.failed';

    return {
      type: eventType,
      data: payload,
      paymentId: orderId,
    };
  }
}
