import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios, { AxiosResponse } from 'axios';
import qs from 'qs';
import moment from 'moment';
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
  ZaloPayAxiosRequestConfig,
  ZaloPayConfirmPaymentData,
  ZaloPayCreateOrderRequest,
  ZaloPayCreateOrderResponse,
  ZaloPayQueryOrderRequest,
  ZaloPayQueryOrderResponse,
  ZaloPayRefundRequest,
  ZaloPayRefundResponse,
  ZaloPayWebhookData,
  ZaloPayWebhookPayload,
} from '../types/zalopay.type';
import { RefundStatus } from '../../domain/entities/refund.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
interface ZaloPayConfig {
  app_id: string;
  key1: string;
  key2: string;
  endpoint: string;
}

interface ZaloPayItem {
  itemid: string;
  itemname: string;
  itemprice: number;
  itemquantity: number;
}

interface ZaloPayEmbedData {
  redirecturl: string;
}

@Injectable()
export class ZaloPayProvider extends BasePaymentProvider {
  private readonly logger = new Logger(ZaloPayProvider.name);
  readonly name = 'ZaloPay';
  readonly providerCode = 'zalopay';
  readonly supportedMethods: PaymentMethod[] = [PaymentMethod.ZALOPAY];
  readonly supportedCurrencies: string[] = ['VND'];
  readonly supportedRegions: string[] = ['VN'];

  constructor(private readonly configService: ConfigService,
    @InjectRepository(PaymentTransaction)
    private paymentTransactionRepository: Repository<PaymentTransaction>,
  ) {
    super();
  }

  private getConfig(): ZaloPayConfig {
    const app_id = this.configService.get<string>('APP_ID_ZALOPAY');
    const key1 = this.configService.get<string>('KEY1_ZALOPAY');
    const key2 = this.configService.get<string>('KEY2_ZALOPAY');
    const endpoint = this.configService.get<string>('ENDPOINT_ZALOPAY');

    if (!app_id || !key1 || !key2 || !endpoint) {
      throw new BadRequestException('ZaloPay configuration is missing');
    }

    return { app_id, key1, key2, endpoint };
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: PaymentMetadata,
  ): Promise<PaymentIntentResult> {
    this.validateCurrency(currency);

    const config = this.getConfig();
    const redirectUrl =
      metadata.returnUrl ||
      this.configService.get<string>('REDIRECT_URL_PAYMENT');
    const callbackUrl =
      metadata.notifyUrl || this.configService.get<string>('IPN_URL_ZALOPAY');

    if (!redirectUrl || !callbackUrl) {
      throw new BadRequestException('ZaloPay URLs configuration is missing');
    }

    try {
      const embed_data: ZaloPayEmbedData = {
        redirecturl: redirectUrl,
      };

      const items: ZaloPayItem[] = [
        {
          itemid: metadata.paymentTransactionId,
          itemname:
            metadata.description ||
            `Thanh toán đơn hàng ${metadata.paymentTransactionId}`,
          itemprice: amount,
          itemquantity: 1,
        },
      ];

      const transID = Math.floor(Math.random() * 1000000);
      const app_trans_id = `${moment().format('YYMMDD')}_${transID}`;

      const orderData: ZaloPayCreateOrderRequest = {
        app_id: config.app_id,
        app_trans_id,
        app_user: metadata.userId,
        app_time: Date.now(),
        bank_code: '',
        item: JSON.stringify(items),
        embed_data: JSON.stringify(embed_data),
        amount: amount,
        callback_url: callbackUrl,
        description: metadata.description || 'Thanh toán đơn hàng',
        mac: '',
      };

      const data =
        config.app_id +
        '|' +
        orderData.app_trans_id +
        '|' +
        orderData.app_user +
        '|' +
        orderData.amount +
        '|' +
        orderData.app_time +
        '|' +
        orderData.embed_data +
        '|' +
        orderData.item;

      orderData.mac = crypto
        .createHmac('sha256', config.key1)
        .update(data)
        .digest('hex');

      const response: AxiosResponse<ZaloPayCreateOrderResponse> =
        await axios.post(config.endpoint, null, {
          params: orderData,
        });

      if (response.data.return_code !== 1) {
        throw new BadRequestException(
          `ZaloPay payment creation failed: ${response.data.return_message}`,
        );
      }

      return {
        paymentId: metadata.paymentTransactionId,
        paymentUrl: response.data.order_url,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      };
    } catch (error) {
      this.logger.error('Failed to create ZaloPay payment intent', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create payment url');
    }
  }

  async confirmPayment(
    paymentId: string,
    confirmationData?: ZaloPayConfirmPaymentData,
  ): Promise<PaymentResult> {
    try {
      const status = await this.getPaymentStatus(paymentId);

      return {
        success: status === PaymentStatus.COMPLETED,
        paymentId,
        transactionId: confirmationData?.zp_trans_id
          ? String(confirmationData.zp_trans_id)
          : paymentId,
        amount: confirmationData?.amount || 0,
        currency: 'VND',
        status,
        gatewayResponse: confirmationData,
      };
    } catch (error) {
      this.logger.error('Failed to confirm ZaloPay payment', error);
      throw new BadRequestException('Failed to confirm payment');
    }
  }

  async refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string,
  ): Promise<RefundResult> {
    const config = this.getConfig();

    try {
      // Find the payment transaction to get zp_trans_id
      const transaction = await this.paymentTransactionRepository.findOne({
        where: {
          providerPaymentId: paymentId,
          provider: 'zalopay',
        },
      });

      if (!transaction) {
        throw new BadRequestException(
          `Payment transaction not found for paymentId ${paymentId}`,
        );
      }

      // Get zp_trans_id from providerTransactionId (stored from webhook)
      const zp_trans_id = transaction.providerTransactionId;

      if (!zp_trans_id) {
        throw new BadRequestException(
          'Cannot refund: missing ZaloPay transaction id (zp_trans_id). Ensure webhook stored it.',
        );
      }

      // Calculate refund amount (in VND, as integer)
      const refundAmount = Math.round(amount ?? Number(transaction.amount));
      if (refundAmount <= 0) {
        throw new BadRequestException('Refund amount must be greater than 0');
      }

      if (refundAmount > Number(transaction.amount)) {
        throw new BadRequestException(
          `Refund amount (${refundAmount}) cannot exceed original payment amount (${transaction.amount})`,
        );
      }

      // Generate m_refund_id in format: yymmdd_appid_mã định danh hoàn tiền
      const refundIdSuffix = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const m_refund_id = `${moment().format('YYMMDD')}_${config.app_id}_${refundIdSuffix}`;

      // Prepare refund request
      const timestamp = Date.now();
      const description = reason || 'Refund payment';

      // Build MAC input
      // If no refund_fee_amount: app_id + | + zp_trans_id + | + amount + | + description + | + timestamp
      const macInput = `${config.app_id}|${zp_trans_id}|${refundAmount}|${description}|${timestamp}`;

      const mac = crypto
        .createHmac('sha256', config.key1)
        .update(macInput)
        .digest('hex');

      const refundRequest: ZaloPayRefundRequest = {
        app_id: config.app_id,
        m_refund_id,
        zp_trans_id: String(zp_trans_id),
        amount: refundAmount,
        timestamp,
        description,
        mac,
      };

      // Call ZaloPay refund API
      const postConfig: ZaloPayAxiosRequestConfig = {
        method: 'post',
        url: 'https://sb-openapi.zalopay.vn/v2/refund',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: qs.stringify(refundRequest),
      };

      const response: AxiosResponse<ZaloPayRefundResponse> = await axios(
        postConfig,
      );

      if (response.data.return_code !== 1) {
        // Handle specific error cases
        const errorMessage = response.data.return_message || 'Unknown error';
        const subMessage = response.data.sub_return_message || '';
        
        // Check if transaction is already being refunded
        if (
          errorMessage.includes('đang refund') ||
          errorMessage.includes('refund') ||
          subMessage.includes('đang refund')
        ) {
          throw new BadRequestException(
            'This transaction is already being refunded or has been refunded. Please check the refund status.',
          );
        }

        throw new BadRequestException(
          `ZaloPay refund failed: ${errorMessage}${subMessage ? ` (${subMessage})` : ''}`,
        );
      }

      // Return refund result
      const refundId = response.data.refund_id
        ? String(response.data.refund_id)
        : m_refund_id;

      this.logger.log(
        `ZaloPay refund processed: ${refundId} for transaction ${zp_trans_id}, amount: ${refundAmount}`,
      );

      return {
        success: true,
        refundId,
        amount: refundAmount / 1, // Already in VND, no conversion needed
        currency: 'VND',
        status: RefundStatus.PROCESSED,
        gatewayResponse: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to process ZaloPay refund', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Failed to process refund. Please try again.',
      );
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const config = this.getConfig();

    try {
      // Note: This assumes paymentId contains app_trans_id
      // You may need to store app_trans_id in metadata for proper querying
      const postData: ZaloPayQueryOrderRequest = {
        app_id: config.app_id,
        app_trans_id: paymentId,
        mac: '',
      };

      const data =
        postData.app_id + '|' + postData.app_trans_id + '|' + config.key1;
      postData.mac = crypto
        .createHmac('sha256', config.key1)
        .update(data)
        .digest('hex');

      const postConfig: ZaloPayAxiosRequestConfig = {
        method: 'post',
        url: 'https://sb-openapi.zalopay.vn/v2/query',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: qs.stringify(postData),
      };

      const response: AxiosResponse<ZaloPayQueryOrderResponse> =
        await axios(postConfig);
      const returnCode = response.data.return_code;

      if (returnCode === 1) {
        return PaymentStatus.COMPLETED;
      } else if (returnCode === 2) {
        return PaymentStatus.PENDING;
      } else {
        return PaymentStatus.FAILED;
      }
    } catch (error) {
      this.logger.error('Failed to get ZaloPay payment status', error);
      return PaymentStatus.FAILED;
    }
  }

  verifyWebhookSignature(
    payload: ZaloPayWebhookPayload,
    signature: string,
  ): boolean {
    try {
      const config = this.getConfig();
      const dataStr = payload.data;
      const reqMac = payload.mac || signature;

      const mac = crypto
        .createHmac('sha256', config.key2)
        .update(dataStr)
        .digest('hex');

      return reqMac === mac;
    } catch (error) {
      this.logger.error('Failed to verify ZaloPay signature', error);
      return false;
    }
  }

  async handleWebhook(
    payload: ZaloPayWebhookPayload,
    signature: string,
  ): Promise<WebhookEvent> {
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    try {
      const dataJson: ZaloPayWebhookData = JSON.parse(payload.data);
      const items: ZaloPayItem[] = JSON.parse(dataJson.item);
      const orderId = items[0]?.itemid || dataJson.app_trans_id;

      let eventType: string = 'payment.failed';

      // Check if zp_trans_id exists and is valid (not 0 or null)
      if (dataJson.zp_trans_id && dataJson.zp_trans_id > 0) {
        eventType = 'payment.succeeded';
      } else if (dataJson.return_code !== undefined) {
        // Fallback: if return_code exists, use it (for compatibility)
        if (dataJson.return_code === 1) {
          eventType = 'payment.succeeded';
        }
      } else {
        // If webhook is received, it typically means payment succeeded
        // ZaloPay usually only sends webhooks for successful payments
        eventType = 'payment.succeeded';
      }

      this.logger.log(
        `ZaloPay webhook processed: ${eventType} for order ${orderId}, zp_trans_id: ${dataJson.zp_trans_id}`,
      );
      return {
        type: eventType,
        data: dataJson,
        paymentId: orderId,
      };
    } catch (error) {
      this.logger.error('Failed to parse ZaloPay webhook data', error);
      throw new BadRequestException('Invalid webhook payload format');
    }
  }
}
