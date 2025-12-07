import * as common from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { StripeProvider } from '../../infrastructure/payment-providers/stripe.provider';
import express, { Response } from 'express';
import { Public } from 'src/modules/identity/api/decorators';

@ApiTags('Payment - Stripe')
@common.Controller('v1/payments/stripe')
@Public()
export class StripePaymentController {
  private readonly logger = new common.Logger(StripePaymentController.name);

  constructor(
    private readonly stripeProvider: StripeProvider,
    private readonly paymentService: PaymentService,
  ) {}

  @common.Post('webhook')
  @common.HttpCode(common.HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleWebhook(
    @common.Req() req: common.RawBodyRequest<express.Request>,
    @common.Headers('stripe-signature') signature: string,
    @common.Res() res: express.Response,
  ): Promise<void> {
    try {
      const payload = req.rawBody || req.body;

      if (!signature) {
        this.logger.error('Missing Stripe signature header');
        res.status(400).json({ error: 'Missing signature' });
        return;
      }

      // Handle webhook with provider
      const webhookEvent = await this.stripeProvider.handleWebhook(
        payload,
        signature,
      );

      // Process webhook event through payment service
      await this.paymentService.processWebhookEvent('stripe', webhookEvent);

      res.status(200).json({ received: true });
    } catch (error) {
      this.logger.error('Failed to handle Stripe webhook', error);
      res.status(400).json({
        error:
          error instanceof Error ? error.message : 'Webhook processing failed',
      });
    }
  }

  @common.Get('return')
  @ApiOperation({ summary: 'Stripe payment return URL (after checkout)' })
  @ApiQuery({ name: 'session_id', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Payment return processed' })
  async handleReturn(
    @common.Query('session_id') sessionId: string,
    @common.Res() res: express.Response,
  ): Promise<void> {
    try {
      if (!sessionId) {
        throw new Error('Missing session_id parameter');
      }

      // Get checkout session to extract payment transaction ID
      const session = await this.stripeProvider.getCheckoutSession(sessionId);
      const paymentTransactionId = session.metadata?.paymentTransactionId;

      if (!paymentTransactionId) {
        throw new Error('Payment transaction ID not found in session metadata');
      }

      // Get payment status
      const status = await this.paymentService.getPaymentStatus(
        'stripe',
        paymentTransactionId,
      );

      // Redirect to frontend with payment status
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/wallet/top-up/return?provider=stripe&paymentId=${paymentTransactionId}&status=${status}&sessionId=${sessionId}`;

      res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('Stripe return URL processing failed', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(
        `${frontendUrl}/wallet/top-up/return?provider=stripe&status=failed&error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`,
      );
    }
  }

  @common.Get('status')
  @ApiOperation({ summary: 'Query Stripe payment status' })
  @ApiQuery({ name: 'paymentId', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  async getStatus(@common.Query('paymentId') paymentId: string) {
    const status = await this.paymentService.getPaymentStatus(
      'stripe',
      paymentId,
    );
    return {
      paymentId,
      status,
      provider: 'stripe',
    };
  }
}
