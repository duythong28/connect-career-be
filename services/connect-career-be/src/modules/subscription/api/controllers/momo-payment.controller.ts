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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { MoMoProvider } from '../../infrastructure/payment-providers/momo.provider';
import {
  MoMoWebhookDto,
} from '../../infrastructure/dtos/momo.dto';
import { MoMoWebhookPayload } from '../../infrastructure/types/momo.type';
import express from 'express';

@ApiTags('Payment - MoMo')
@Controller('v1/payments/momo')
@ApiBearerAuth()
export class MoMoPaymentController {
  private readonly logger = new Logger(MoMoPaymentController.name);
  constructor(
    private readonly momoProvider: MoMoProvider,
    private readonly momoPaymentService: PaymentService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MoMo IPN webhook endpoint' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleWebhook(@Body() payload: MoMoWebhookDto, @Res() res: express.Response) {
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
      const webhookEvent = await this.momoProvider.handleWebhook(
        MoMoWebhookPayload,
        payload.signature,
      );

      res.status(204).json({
        resultCode: 0,
        message: 'Success',
      });
    } catch (error) {
      this.logger.error('Failed to handle MoMo webhook', error);
      res.status(204).json({
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
      const status = await this.momoProvider.getPaymentStatus(orderId);

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
}
