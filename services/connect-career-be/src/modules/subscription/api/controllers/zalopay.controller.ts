import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { ZaloPayProvider } from '../../infrastructure/payment-providers/zalopay.provider';
import { ZaloPayWebhookDto } from '../../infrastructure/dtos/zalopay.dto';
import { ZaloPayWebhookPayload } from '../../infrastructure/types/zalopay.type';
import express from 'express';
import { Public } from 'src/modules/identity/api/decorators';

@ApiTags('Payment - ZaloPay')
@Controller('v1/payments/zalopay')
@Public()
export class ZaloPayPaymentController {
  private readonly logger = new Logger(ZaloPayPaymentController.name);

  constructor(
    private readonly zaloPayProvider: ZaloPayProvider,
    private readonly paymentService: PaymentService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ZaloPay IPN webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Body() payload: ZaloPayWebhookDto,
    @Res() res: express.Response,
  ): Promise<void> {
    try {
      const zaloPayWebhookPayload: ZaloPayWebhookPayload = {
        data: payload.data,
        mac: payload.mac,
      };
      const webhookEvent = await this.zaloPayProvider.handleWebhook(
        zaloPayWebhookPayload,
        payload.mac,
      );
      // Process webhook event through payment service
      await this.paymentService.processWebhookEvent('zalopay', webhookEvent);

      res.status(200).json({
        return_code: 1,
        return_message: 'Success',
      });
    } catch (error) {
      this.logger.error('Failed to handle ZaloPay webhook', error);
      res.status(200).json({
        return_code: -1,
        return_message: error instanceof Error ? error.message : 'Failed',
      });
    }
  }

  @Get('return')
  @ApiOperation({ summary: 'ZaloPay payment return URL' })
  @ApiQuery({ name: 'app_trans_id', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Payment return processed' })
  async handleReturn(
    @Query('app_trans_id') appTransId: string,
    @Query('status') status: string,
    @Res() res: express.Response,
  ): Promise<void> {
    try {
      if (!appTransId) {
        throw new Error('Missing app_trans_id parameter');
      }

      // Confirm payment through payment service
      await this.paymentService.confirmPayment('zalopay', appTransId, {
        app_trans_id: appTransId,
      });

      const paymentStatus = await this.paymentService.getPaymentStatus(
        'zalopay',
        appTransId,
      );

      // Redirect to frontend with payment status
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/wallet/top-up/return?provider=zalopay&appTransId=${appTransId}&status=${paymentStatus}`;

      res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('ZaloPay return URL processing failed', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(
        `${frontendUrl}/wallet/top-up/return?provider=zalopay&status=failed&error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`,
      );
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Query ZaloPay payment status' })
  @ApiQuery({ name: 'app_trans_id', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  async getStatus(@Query('app_trans_id') appTransId: string) {
    const status = await this.paymentService.getPaymentStatus(
      'zalopay',
      appTransId,
    );
    return {
      paymentId: appTransId,
      status,
      provider: 'zalopay',
    };
  }
}
