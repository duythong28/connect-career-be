import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../domain/entities/organization.entity';
import { Application } from 'src/modules/applications/domain/entities/application.entity';
import { OrganizationReview } from '../../domain/entities/organization-reviews.entity';
import {
  CreateOrganizationReviewDto,
  UpdateOrganizationReviewDto,
} from '../dtos/organization-review.dto';

@Injectable()
export class OrganizationReviewService {
  constructor(
    @InjectRepository(OrganizationReview)
    private readonly organizationReviewRepository: Repository<OrganizationReview>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {}

  async createReview(
    candidateId: string,
    dto: CreateOrganizationReviewDto,
  ): Promise<OrganizationReview> {
    const organization = await this.organizationRepository.findOne({
      where: { id: dto.organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (dto.applicationId) {
      const application = await this.applicationRepository.findOne({
        where: { id: dto.applicationId },
      });
      if (!application) {
        throw new NotFoundException('Application not found');
      }
      if (application.candidateId !== candidateId) {
        throw new BadRequestException(
          'Application does not belong to candidate',
        );
      }
    }

    const review = this.organizationReviewRepository.create({
      organizationId: dto.organizationId,
      candidateId: candidateId,
      applicationId: dto.applicationId,
      overallRating: dto.overallRating,
      summary: dto.summary,
      overtimePolicySatisfaction: dto.overtimePolicySatisfaction,
      overtimePolicyReason: dto.overtimePolicyReason,
      whatMakesYouLoveWorkingHere: dto.whatMakesYouLoveWorkingHere,
      suggestionForImprovement: dto.suggestionForImprovement,
      ratingDetails: dto.ratingDetails,
      wouldRecommend: dto.wouldRecommend,
    });

    return await this.organizationReviewRepository.save(review);
  }

  async updateReview(
    reviewId: string,
    candidateId: string,
    dto: UpdateOrganizationReviewDto,
  ): Promise<OrganizationReview> {
    const review = await this.organizationReviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.candidateId !== candidateId) {
      throw new BadRequestException('You can only update your own reviews');
    }

    Object.assign(review, dto);
    return await this.organizationReviewRepository.save(review);
  }

  async getReviewById(reviewId: string): Promise<OrganizationReview> {
    const review = await this.organizationReviewRepository.findOne({
      where: { id: reviewId },
      relations: ['organization', 'candidate', 'application'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async getReviewsByOrganization(
    organizationId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{
    data: OrganizationReview[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.organizationReviewRepository.findAndCount({
      where: { organizationId },
      relations: ['candidate', 'application'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getReviewsByCandidate(
    candidateId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{
    data: OrganizationReview[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.organizationReviewRepository.findAndCount({
      where: { candidateId },
      relations: ['organization', 'application'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async deleteReview(reviewId: string, candidateId: string): Promise<void> {
    const review = await this.organizationReviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.candidateId !== candidateId) {
      throw new BadRequestException('You can only delete your own reviews');
    }

    await this.organizationReviewRepository.remove(review);
  }

  async getOrganizationReviewStats(organizationId: string) {
    const reviews = await this.organizationReviewRepository.find({
      where: { organizationId },
    });

    if (reviews.length === 0) {
      return {
        averageOverallRating: 0,
        averageSalaryBenefits: 0,
        averageTrainingLearning: 0,
        averageManagementCares: 0,
        averageCultureFun: 0,
        averageOfficeWorkspace: 0,
        recommendationRate: 0,
        totalReviews: 0,
      };
    }

    const total = reviews.length;
    const averageOverallRating =
      reviews.reduce((sum, r) => sum + r.overallRating, 0) / total;
    const averageSalaryBenefits =
      reviews.reduce((sum, r) => sum + r.ratingDetails.salaryBenefits, 0) /
      total;
    const averageTrainingLearning =
      reviews.reduce((sum, r) => sum + r.ratingDetails.trainingLearning, 0) /
      total;
    const averageManagementCares =
      reviews.reduce((sum, r) => sum + r.ratingDetails.managementCares, 0) /
      total;
    const averageCultureFun =
      reviews.reduce((sum, r) => sum + r.ratingDetails.cultureFun, 0) / total;
    const averageOfficeWorkspace =
      reviews.reduce((sum, r) => sum + r.ratingDetails.officeWorkspace, 0) /
      total;
    const recommendationRate =
      reviews.filter((r) => r.wouldRecommend).length / total;

    return {
      averageOverallRating: Number(averageOverallRating.toFixed(2)),
      averageSalaryBenefits: Number(averageSalaryBenefits.toFixed(2)),
      averageTrainingLearning: Number(averageTrainingLearning.toFixed(2)),
      averageManagementCares: Number(averageManagementCares.toFixed(2)),
      averageCultureFun: Number(averageCultureFun.toFixed(2)),
      averageOfficeWorkspace: Number(averageOfficeWorkspace.toFixed(2)),
      recommendationRate: Number((recommendationRate * 100).toFixed(2)),
      totalReviews: total,
    };
  }
}
