// services/connect-career-be/src/modules/subscription/api/services/entitlement.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entitlement } from '../../domain/entities/entitlement.entity';
import {
  UsageCounter,
  FeatureKey,
} from '../../domain/entities/usage-counter.entity';
import {
  PlanSubject,
  Subscription,
} from '../../domain/entities/subscription.entity';
import { PlanFeature } from '../../domain/entities/plan-feature.entity';

@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(
    @InjectRepository(Entitlement)
    private entitlementRepository: Repository<Entitlement>,
    @InjectRepository(UsageCounter)
    private usageCounterRepository: Repository<UsageCounter>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(PlanFeature)
    private planFeatureRepository: Repository<PlanFeature>,
  ) {}

  async checkAndConsume(
    subjectType: PlanSubject,
    subjectId: string,
    feature: FeatureKey,
    cost: number = 1,
  ): Promise<boolean> {
    try {
      const entitlement = await this.entitlementRepository.findOne({
        where: { subjectType, subjectId, featureKey: feature },
      });

      if (!entitlement) {
        this.logger.warn(
          `No entitlement found for ${subjectType}:${subjectId} feature:${feature}`,
        );
        return false;
      }

      const period = this.getCurrentPeriod();
      let usageCounter = await this.usageCounterRepository.findOne({
        where: { subjectType, subjectId, featureKey: feature, period },
      });

      if (!usageCounter) {
        usageCounter = this.usageCounterRepository.create({
          subjectType,
          subjectId,
          featureKey: feature,
          period,
          used: 0,
        });
      }

      if (!entitlement.canUse(usageCounter.used + cost)) {
        this.logger.warn(
          `Quota exceeded for ${subjectType}:${subjectId} feature:${feature}`,
        );
        return false;
      }

      usageCounter.used += cost;
      await this.usageCounterRepository.save(usageCounter);

      this.logger.log(
        `Consumed ${cost} units of ${feature} for ${subjectType}:${subjectId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error checking/consuming entitlement: ${error.message}`,
      );
      return false;
    }
  }

  async rebuildEntitlements(
    subjectType: PlanSubject,
    subjectId: string,
  ): Promise<void> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { subjectType, subjectId },
        relations: ['product', 'product.planFeatures'],
      });

      if (!subscription || !subscription.isActive) {
        this.logger.warn(
          `No active subscription found for ${subjectType}:${subjectId}`,
        );
        return;
      }

      const planFeatures = await this.planFeatureRepository.find({
        where: { productId: subscription.productId },
      });

      for (const planFeature of planFeatures) {
        await this.entitlementRepository.upsert(
          {
            subjectType,
            subjectId,
            featureKey: planFeature.featureKey,
            limitMonth: planFeature.limitMonth,
            sourceSubscriptionId: subscription.id,
          },
          ['subjectType', 'subjectId', 'featureKey'],
        );
      }

      this.logger.log(`Rebuilt entitlements for ${subjectType}:${subjectId}`);
    } catch (error) {
      this.logger.error(`Error rebuilding entitlements: ${error.message}`);
    }
  }

  async getEntitlementStatus(
    subjectType: PlanSubject,
    subjectId: string,
    feature: FeatureKey,
  ): Promise<{
    hasEntitlement: boolean;
    limit: number | null;
    used: number;
    remaining: number | null;
    canUse: boolean;
  }> {
    const entitlement = await this.entitlementRepository.findOne({
      where: { subjectType, subjectId, featureKey: feature },
    });

    if (!entitlement) {
      return {
        hasEntitlement: false,
        limit: null,
        used: 0,
        remaining: null,
        canUse: false,
      };
    }

    const period = this.getCurrentPeriod();
    const usageCounter = await this.usageCounterRepository.findOne({
      where: { subjectType, subjectId, featureKey: feature, period },
    });

    const used = usageCounter?.used || 0;
    const limit = entitlement.limitMonth;
    const remaining = limit ? Math.max(0, limit - used) : null;
    const canUse = entitlement.canUse(used);

    return {
      hasEntitlement: true,
      limit,
      used,
      remaining,
      canUse,
    };
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
  }
}
