import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WalletService } from '../services/wallet.service';
import { CurrentUserPayload } from 'src/modules/identity/api/decorators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateProfile } from 'src/modules/profile/domain/entities/candidate-profile.entity';

@Injectable()
export class WalletDeductionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WalletDeductionInterceptor.name);

  constructor(
    private readonly walletService: WalletService,
    @InjectRepository(CandidateProfile)
    private readonly candidateProfileRepository: Repository<CandidateProfile>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const actionCode = request.billableAction;

    // If no billable action, proceed without deduction
    if (!actionCode) {
      return next.handle();
    }

    const user = request.user as CurrentUserPayload;
    if (!user?.sub) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const context = await this.extractContext(
            actionCode,
            user.sub,
            response,
            request,
          );

          const result = await this.walletService.deductForAction(
            user.sub,
            actionCode,
            context,
          );

          if (!result.success) {
            this.logger.error(
              `Failed to deduct for action ${actionCode}: ${result.error}`,
            );
          } else {
            this.logger.log(
              `Successfully deducted for action ${actionCode}. New balance: ${result.newBalance}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error deducting wallet for action ${actionCode}: ${error.message}`,
            error.stack,
          );
        }
      }),
    );
  }

  private async extractContext(
    actionCode: string,
    userId: string,
    response: any,
    request: any,
  ): Promise<{
    candidateProfileId?: string;
    recruiterProfileId?: string;
    organizationId?: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
    metadata?: Record<string, any>;
  }> {
    const context: any = {};

    if (response?.id) {
      context.relatedEntityId = response.id;

      if (response.title && response.organizationId) {
        context.relatedEntityType = 'job';
        context.organizationId = response.organizationId;
      } else if (response.jobId && response.candidateId) {
        context.relatedEntityType = 'application';
        context.relatedEntityId = response.id;
      } else if (response.sessionId || response.callId) {
        // Mock interview session
        context.relatedEntityType = 'mock_interview';
        context.relatedEntityId = response.sessionId || response.id;
      } else if (response.data || response.success) {
        // CV enhancement response - extract CV ID from request body if available
        if (request.body?.cvId) {
          context.relatedEntityId = request.body.cvId;
          context.relatedEntityType = 'cv_enhancement';
        } else if (request.body?.cv?.id) {
          context.relatedEntityId = request.body.cv.id;
          context.relatedEntityType = 'cv_enhancement';
        }
      }
    }

    // Extract organization ID from response or request body
    if (response?.organizationId) {
      context.organizationId = response.organizationId;
    } else if (request.body?.organizationId) {
      context.organizationId = request.body.organizationId;
    }

    switch (actionCode) {
      case 'POST_JOB':
      case 'AI_CV_ENHANCEMENT':
      case 'MOCK_AI_INTERVIEW':
        // Candidate actions - get candidate profile
        const candidateProfile = await this.candidateProfileRepository.findOne({
          where: { userId },
        });
        if (candidateProfile) {
          context.candidateProfileId = candidateProfile.id;
        }
        break;
    }

    // Add metadata
    context.metadata = {
      actionCode,
      timestamp: new Date().toISOString(),
      userAgent: request.headers['user-agent'],
    };

    return context;
  }
}
