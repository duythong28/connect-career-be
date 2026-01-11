import { AxiosRequestConfig } from 'axios';

export interface ZaloPayCreateOrderRequest {
  app_id: string;
  app_trans_id: string;
  app_user: string;
  app_time: number;
  bank_code: string;
  item: string;
  embed_data: string;
  amount: number;
  callback_url: string;
  description: string;
  mac: string;
}

export interface ZaloPayCreateOrderResponse {
  return_code: number;
  return_message: string;
  sub_return_code: number;
  sub_return_message: string;
  zp_trans_token: string;
  order_url: string;
  order_token: string;
}

export interface ZaloPayQueryOrderRequest {
  app_id: string;
  app_trans_id: string;
  mac: string;
}

export interface ZaloPayQueryOrderResponse {
  return_code: number;
  return_message: string;
  sub_return_code: number;
  sub_return_message: string;
  zp_trans_id: number;
  amount: number;
  discount_amount: number;
  zp_trans_token: string;
  server_time: number;
}

export interface ZaloPayWebhookPayload {
  data: string;
  mac: string;
}

export interface ZaloPayWebhookData {
  return_code?: number;
  app_id: string;
  app_trans_id: string;
  app_time: number;
  app_user: string;
  amount: number;
  embed_data: string;
  item: string;
  zp_trans_id: number;
  server_time: number;
  channel: number;
  merchant_user_id: string;
  zp_user_id?: string;
  user_fee_amount: number;
  discount_amount: number;
}

export interface ZaloPayConfirmPaymentData {
  zp_trans_id?: number;
  amount?: number;
  return_code?: number;
}

export interface ZaloPayAxiosRequestConfig extends AxiosRequestConfig {
  method: 'post';
  url: string;
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded';
  };
  data: string;
}

export interface ZaloPayAxiosRequestConfig extends AxiosRequestConfig {
  method: 'post';
  url: string;
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded';
  };
  data: string;
}

export interface ZaloPayRefundRequest {
  app_id: string;
  m_refund_id: string;
  zp_trans_id: string;
  amount: number;
  refund_fee_amount?: number;
  timestamp: number;
  description: string;
  mac: string;
}

export interface ZaloPayRefundResponse {
  return_code: number;
  return_message: string;
  sub_return_code?: number;
  sub_return_message?: string;
  refund_id?: number;
}