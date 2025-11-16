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
  ZaloPayWebhookData,
  ZaloPayWebhookPayload,
} from '../types/zalopay.type';
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

  constructor(private readonly configService: ConfigService) {
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
    // ZaloPay refund implementation would go here
    this.logger.warn('ZaloPay refund not yet implemented');
    throw new BadRequestException('Refund not yet implemented for ZaloPay');
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
