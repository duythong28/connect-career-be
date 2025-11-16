import { AxiosRequestConfig } from 'axios';

export interface MoMoCreatePaymentRequest {
  partnerCode: string;
  accessKey: string;
  requestId: string;
  amount: number;
  orderId: string;
  orderInfo: string;
  redirectUrl: string;
  ipnUrl: string;
  extraData: string;
  requestType: string;
  signature: string;
  lang: string;
}

export interface MoMoCreatePaymentResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number;
  payUrl: string;
  deeplink?: string;
  qrCodeUrl?: string;
}

export interface MoMoQueryPaymentRequest {
  partnerCode: string;
  requestId: string;
  orderId: string;
  signature: string;
  lang: string;
}

export interface MoMoQueryPaymentResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  extraData: string;
  amount: number;
  transId: number;
  payType: string;
  resultCode: number;
  refundTrans: any[];
  message: string;
  responseTime: number;
  lastUpdated: number;
}

export interface MoMoWebhookPayload {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: number;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  extraData: string;
  signature: string;
}

export interface MoMoConfirmPaymentData {
  transactionId?: string;
  amount?: number;
  resultCode?: number;
}

export interface MoMoAxiosRequestConfig extends AxiosRequestConfig {
  method: 'POST';
  url: string;
  headers: {
    'Content-Type': 'application/json';
    'Content-Length': number;
  };
  data: string;
}
