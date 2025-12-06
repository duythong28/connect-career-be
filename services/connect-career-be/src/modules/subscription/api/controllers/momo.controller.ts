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
import { MoMoProvider } from '../../infrastructure/payment-providers/momo.provider';
import { MoMoWebhookDto } from '../../infrastructure/dtos/momo.dto';
import { MoMoWebhookPayload } from '../../infrastructure/types/momo.type';
import express from 'express';
import { PaymentService } from '../services/payment.service';
import { Public } from 'src/modules/identity/api/decorators';

@ApiTags('Payment - MoMo')
@Controller('v1/payments/momo')
@Public()
export class MoMoPaymentController {
  private readonly logger = new Logger(MoMoPaymentController.name);
  constructor(
    private readonly momoProvider: MoMoProvider,
    private readonly paymentService: PaymentService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MoMo IPN webhook endpoint' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Body() payload: MoMoWebhookDto,
    @Res() res: express.Response,
  ) {
    try {
      const MoMoWebhookPayload: MoMoWebhookPayload = {
        partnerCode: payload.partnerCode,
        orderId: payload.orderId,
        requestId: payload.requestId,
        amount: payload.amount,
        orderInfo: payload.orderInfo,
        orderType: payload.orderType,
        transId: payload.transId,
        resultCode: payload.resultCode,
        message: payload.message,
        payType: payload.payType,
        responseTime: payload.responseTime,
        extraData: payload.extraData,
        signature: payload.signature,
      };
      console.log('MoMoWebhookPayload', MoMoWebhookPayload);

      const webhookEvent = await this.momoProvider.handleWebhook(
        MoMoWebhookPayload,
        payload.signature,
      );
      // Process webhook event through payment service
      await this.paymentService.processWebhookEvent('momo', webhookEvent);

      res.status(200).json({
        resultCode: 0,
        message: 'Success',
      });
    } catch (error) {
      this.logger.error('Failed to handle MoMo webhook', error);
      res.status(200).json({
        resultCode: 10,
        message: error instanceof Error ? error.message : 'Failed',
      });
    }
  }

  @Get('return')
  @ApiOperation({ summary: 'MoMo payment return URL' })
  @ApiQuery({ name: 'orderId', required: true, type: String })
  @ApiQuery({ name: 'resultCode', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Payment return processed' })
  async handleReturn(
    @Query('orderId') orderId: string,
    @Query('resultCode') resultCode: string,
    @Res() res: express.Response,
  ): Promise<void> {
    try {
      // Confirm payment through payment service
      await this.paymentService.confirmPayment('momo', orderId, {
        resultCode: parseInt(resultCode, 10),
      });

      const status = await this.paymentService.getPaymentStatus(
        'momo',
        orderId,
      );

      // Redirect to frontend with payment status
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/wallet/top-up/return?provider=momo&orderId=${orderId}&status=${status}&resultCode=${resultCode}`;

      res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('MoMo return URL processing failed', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(
        `${frontendUrl}/wallet/top-up/return?provider=momo&status=failed&error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`,
      );
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Query MoMo payment status' })
  @ApiQuery({ name: 'orderId', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  async getStatus(@Query('orderId') orderId: string) {
    const status = await this.paymentService.getPaymentStatus('momo', orderId);
    return {
      paymentId: orderId,
      status,
      provider: 'momo',
    };
  }
}
