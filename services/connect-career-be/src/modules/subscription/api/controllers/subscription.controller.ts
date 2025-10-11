import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubscriptionService } from '../services/subscription.service';
import { EntitlementService } from '../services/entitlement.service';
import { PlanSubject } from '../../domain/entities/subscription.entity';
import * as decorators from 'src/modules/identity/api/decorators';
import {
  CheckoutDto,
  CreateSubscriptionDto,
  StartTrialDto,
  UpgradeSubscriptionDto,
} from '../dtos/subscription.dto';
import { FeatureKey } from '../../domain/entities/usage-counter.entity';

@ApiTags('Subscription')
@Controller('v1/subscription')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly entitlementService: EntitlementService,
  ) {}

  @Get('my-subscription')
  @ApiOperation({ summary: 'Get current user subscription' })
  @ApiQuery({ name: 'subjectType', enum: PlanSubject, required: false })
  @ApiResponse({ status: 200, description: 'Subscription details' })
  async getMySubscription(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Query('subjectType') subjectType: PlanSubject = PlanSubject.USER,
  ) {
    const subscription = await this.subscriptionService.getUserSubscription(
      subjectType,
      user.sub,
    );

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    return {
      success: true,
      data: subscription,
    };
  }
  @Get('products')
  @ApiOperation({ summary: 'Get available products' })
  @ApiQuery({ name: 'subjectType', enum: PlanSubject, required: false })
  @ApiResponse({ status: 200, description: 'Available products' })
  async getProducts(
    @Query('subjectType') subjectType: PlanSubject = PlanSubject.USER,
  ) {
    const products = await this.subscriptionService.getProducts(subjectType);

    return {
      success: true,
      data: products,
    };
  }

  @Get('products/:productId/prices')
  @ApiOperation({ summary: 'Get prices for a product' })
  @ApiResponse({ status: 200, description: 'Product prices' })
  async getProductPrices(@Param('productId') productId: string) {
    const prices = await this.subscriptionService.getPrices(productId);

    return {
      success: true,
      data: prices,
    };
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Create checkout session' })
  @ApiResponse({ status: 200, description: 'Checkout session created' })
  createCheckout(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Body() checkoutDto: CheckoutDto,
  ) {
    // This would integrate with your payment orchestrator
    // For now, returning a mock response
    return {
      success: true,
      data: {
        checkoutUrl: `https://checkout.example.com/session_${Date.now()}`,
        sessionId: `sess_${Date.now()}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      },
    };
  }

  @Post('activate')
  @ApiOperation({ summary: 'Activate subscription (webhook handler)' })
  @ApiResponse({ status: 200, description: 'Subscription activated' })
  async activateSubscription(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Body() createDto: CreateSubscriptionDto,
  ) {
    const subscription = await this.subscriptionService.createSubscription(
      PlanSubject.USER,
      user.sub,
      createDto.productId,
      createDto.priceId,
      createDto.provider,
      createDto.providerSubscriptionId,
    );

    return {
      success: true,
      data: subscription,
    };
  }

  @Post('upgrade')
  @ApiOperation({ summary: 'Upgrade subscription plan' })
  @ApiResponse({ status: 200, description: 'Subscription upgraded' })
  async upgradeSubscription(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Body() upgradeDto: UpgradeSubscriptionDto,
  ) {
    // Cancel current subscription
    await this.subscriptionService.cancelSubscription(
      PlanSubject.USER,
      user.sub,
    );

    // Create new subscription
    const newSubscription = await this.subscriptionService.createSubscription(
      PlanSubject.USER,
      user.sub,
      upgradeDto.productId,
      upgradeDto.priceId,
      upgradeDto.provider,
    );

    return {
      success: true,
      data: newSubscription,
    };
  }

  @Post('start-trial')
  @ApiOperation({ summary: 'Start 7-day trial' })
  @ApiResponse({ status: 200, description: 'Trial started' })
  async startTrial(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Body() trialDto: StartTrialDto,
  ) {
    // Check if user already has a subscription
    const existingSubscription =
      await this.subscriptionService.getUserSubscription(
        PlanSubject.USER,
        user.sub,
      );

    if (existingSubscription) {
      throw new BadRequestException('User already has a subscription');
    }

    const subscription = await this.subscriptionService.createSubscription(
      PlanSubject.USER,
      user.sub,
      trialDto.productId,
      trialDto.priceId,
      'trial', // Special provider for trials
    );

    return {
      success: true,
      data: subscription,
    };
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  async cancelSubscription(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    await this.subscriptionService.cancelSubscription(
      PlanSubject.USER,
      user.sub,
    );

    return {
      success: true,
      message: 'Subscription cancelled successfully',
    };
  }

  @Get('usage/:feature')
  @ApiOperation({ summary: 'Get feature usage status' })
  @ApiResponse({ status: 200, description: 'Feature usage status' })
  async getFeatureUsage(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Param('feature') feature: FeatureKey,
    @Query('subjectType') subjectType: PlanSubject = PlanSubject.USER,
  ) {
    const status = await this.entitlementService.getEntitlementStatus(
      subjectType,
      user.sub,
      feature,
    );

    return {
      success: true,
      data: {
        feature,
        ...status,
      },
    };
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get all feature usage status' })
  @ApiResponse({ status: 200, description: 'All feature usage status' })
  async getAllFeatureUsage(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Query('subjectType') subjectType: PlanSubject = PlanSubject.USER,
  ) {
    const features = Object.values(FeatureKey);
    const usageStatus = {};

    for (const feature of features) {
      usageStatus[feature] = await this.entitlementService.getEntitlementStatus(
        subjectType,
        user.sub,
        feature,
      );
    }

    return {
      success: true,
      data: usageStatus,
    };
  }

  @Get('billing/history')
  @ApiOperation({ summary: 'Get billing history' })
  @ApiResponse({ status: 200, description: 'Billing history' })
  getBillingHistory(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    // This would integrate with your billing service
    // For now, returning a mock response
    return {
      success: true,
      data: {
        invoices: [],
        transactions: [],
      },
    };
  }

  @Get('billing/upcoming')
  @ApiOperation({ summary: 'Get upcoming billing' })
  @ApiResponse({ status: 200, description: 'Upcoming billing info' })
  async getUpcomingBilling(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    const subscription = await this.subscriptionService.getUserSubscription(
      PlanSubject.USER,
      user.sub,
    );

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    return {
      success: true,
      data: {
        nextBillingDate: subscription.currentPeriodEnd,
        amount: subscription.price?.unitAmount || 0,
        currency: subscription.price?.currency || 'VND',
      },
    };
  }

  @Post('webhook/stripe')
  @ApiOperation({ summary: 'Stripe webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleStripeWebhook(@Body() payload: any) {
    // This would handle Stripe webhooks
    // For now, just acknowledge receipt
    return {
      success: true,
      message: 'Webhook received',
    };
  }

  @Post('webhook/momo')
  @ApiOperation({ summary: 'MoMo webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  handleMoMoWebhook(@Body() payload: any) {
    // This would handle MoMo webhooks
    return {
      success: true,
      message: 'Webhook received',
    };
  }

  @Post('webhook/zalopay')
  @ApiOperation({ summary: 'ZaloPay webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  handleZaloPayWebhook(@Body() payload: any) {
    // This would handle ZaloPay webhooks
    return {
      success: true,
      message: 'Webhook received',
    };
  }

  @Post('webhook/vietqr')
  @ApiOperation({ summary: 'VietQR webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  handleVietQRWebhook(@Body() payload: any) {
    // This would handle VietQR webhooks
    return {
      success: true,
      message: 'Webhook received',
    };
  }
}
