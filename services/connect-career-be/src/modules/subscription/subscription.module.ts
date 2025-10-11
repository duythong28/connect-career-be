import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './domain/entities/subscription.entity';
import { Product } from './domain/entities/product.entity';
import { Price } from './domain/entities/price.entity';
import { PlanFeature } from './domain/entities/plan-feature.entity';
import { Entitlement } from './domain/entities/entitlement.entity';
import { UsageCounter } from './domain/entities/usage-counter.entity';
import { Invoice } from './domain/entities/invoice.entity';
import { PaymentTransaction } from './domain/entities/payment-transaction.entity';
import { SubscriptionService } from './api/services/subscription.service';
import { EntitlementService } from './api/services/entitlement.service';
import { EntitlementGuard } from './api/guards/entitlement.guard';
import { SubscriptionController } from './api/controllers/subscription.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      Product,
      Price,
      PlanFeature,
      Entitlement,
      UsageCounter,
      Invoice,
      PaymentTransaction,
    ]),
  ],
  providers: [SubscriptionService, EntitlementService, EntitlementGuard],
  controllers: [SubscriptionController],
  exports: [SubscriptionService, EntitlementService, EntitlementGuard],
})
export class SubscriptionModule {}
