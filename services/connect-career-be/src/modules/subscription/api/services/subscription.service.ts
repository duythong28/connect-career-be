// services/connect-career-be/src/modules/subscription/api/services/subscription.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Subscription,
  PlanSubject,
  SubscriptionStatus,
  Provider,
} from '../../domain/entities/subscription.entity';
import { Product } from '../../domain/entities/product.entity';
import { Price } from '../../domain/entities/price.entity';
import { EntitlementService } from './entitlement.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Price)
    private priceRepository: Repository<Price>,
    private entitlementService: EntitlementService,
  ) {}

  async getUserSubscription(
    subjectType: PlanSubject,
    subjectId: string,
  ): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { subjectType, subjectId },
      relations: ['product', 'price'],
    });
  }

  async createSubscription(
    subjectType: PlanSubject,
    subjectId: string,
    productId: string,
    priceId: string,
    provider: string,
    providerSubscriptionId?: string,
  ): Promise<Subscription> {
    const subscription = this.subscriptionRepository.create({
      subjectType,
      subjectId,
      productId,
      priceId,
      status: SubscriptionStatus.ACTIVE,
      startAt: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: this.calculatePeriodEnd(),
      provider: provider as Provider,
      providerSubscriptionId,
    });

    const savedSubscription =
      await this.subscriptionRepository.save(subscription);

    // Rebuild entitlements after subscription creation
    await this.entitlementService.rebuildEntitlements(subjectType, subjectId);

    this.logger.log(`Created subscription for ${subjectType}:${subjectId}`);
    return savedSubscription;
  }

  async activateSubscription(
    subjectType: PlanSubject,
    subjectId: string,
  ): Promise<void> {
    const subscription = await this.getUserSubscription(subjectType, subjectId);
    if (subscription) {
      subscription.status = SubscriptionStatus.ACTIVE;
      await this.subscriptionRepository.save(subscription);

      // Rebuild entitlements
      await this.entitlementService.rebuildEntitlements(subjectType, subjectId);
    }
  }

  async cancelSubscription(
    subjectType: PlanSubject,
    subjectId: string,
  ): Promise<void> {
    const subscription = await this.getUserSubscription(subjectType, subjectId);
    if (subscription) {
      subscription.status = SubscriptionStatus.CANCELED;
      subscription.cancelAtPeriodEnd = true;
      await this.subscriptionRepository.save(subscription);
    }
  }

  async getProducts(subjectType: PlanSubject): Promise<Product[]> {
    return this.productRepository.find({
      where: { subject: subjectType, active: true },
      relations: ['prices', 'planFeatures'],
    });
  }

  async getPrices(productId: string): Promise<Price[]> {
    return this.priceRepository.find({
      where: { productId, active: true },
    });
  }

  private calculatePeriodEnd(): Date {
    const now = new Date();
    const nextMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
    );
    return nextMonth;
  }
}
