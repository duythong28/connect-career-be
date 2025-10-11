// services/connect-career-be/src/modules/subscription/api/guards/entitlement.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementService } from '../services/entitlement.service';
import { FeatureKey } from '../../domain/entities/usage-counter.entity';
import { PlanSubject } from '../../domain/entities/subscription.entity';

export const REQUIRES_FEATURE = 'requiresFeature';
export const RequiresFeature = (feature: FeatureKey, cost: number = 1) =>
  SetMetadata(REQUIRES_FEATURE, { feature, cost });

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private entitlementService: EntitlementService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureRequirement = this.reflector.getAllAndOverride<{
      feature: FeatureKey;
      cost: number;
    }>(REQUIRES_FEATURE, [context.getHandler(), context.getClass()]);

    if (!featureRequirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }
    const subjectType = this.getSubjectType(request, user);
    const subjectId = this.getSubjectId(user);

    const canAccess = await this.entitlementService.checkAndConsume(
      subjectType,
      subjectId,
      featureRequirement.feature,
      featureRequirement.cost,
    );

    if (!canAccess) {
      throw new ForbiddenException(
        `Feature '${featureRequirement.feature}' requires upgrade or quota exceeded`,
      );
    }

    return true;
  }

  private getSubjectType(request: any, user: any): PlanSubject {
    return PlanSubject.USER;
  }

  private getSubjectId(user: any): string {
    return user.sub || user.id;
  }
}
