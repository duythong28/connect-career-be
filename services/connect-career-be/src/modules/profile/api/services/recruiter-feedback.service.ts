import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/identity/domain/entities';
import { Application } from 'src/modules/applications/domain/entities/application.entity';
import { Interview } from 'src/modules/applications/domain/entities/interview.entity';
import { RecruiterFeedback } from '../../domain/entities/recruiter-feedbacks.entity';
import {
  CreateRecruiterFeedbackDto,
  UpdateRecruiterFeedbackDto,
} from '../dtos/recruiter-feedback.dto';

@Injectable()
export class RecruiterFeedbackService {
  constructor(
    @InjectRepository(RecruiterFeedback)
    private readonly recruiterFeedbackRepository: Repository<RecruiterFeedback>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
  ) {}

  async createFeedback(
    candidateId: string,
    dto: CreateRecruiterFeedbackDto,
  ): Promise<RecruiterFeedback> {
    // Verify HR user exists
    const hrUser = await this.userRepository.findOne({
      where: { id: dto.recruiterUserId },
    });
    if (!hrUser) {
      throw new NotFoundException('HR user not found');
    }

    // If applicationId is provided, verify it exists and belongs to the candidate
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

    // If interviewId is provided, verify it exists and belongs to the candidate's application
    if (dto.interviewId) {
      const interview = await this.interviewRepository.findOne({
        where: { id: dto.interviewId },
        relations: ['application'],
      });
      if (!interview) {
        throw new NotFoundException('Interview not found');
      }
      if (interview.application?.candidateId !== candidateId) {
        throw new BadRequestException('Interview does not belong to candidate');
      }
    }

    const feedback = this.recruiterFeedbackRepository.create({
      candidateId: candidateId,
      recruiterUserId: dto.recruiterUserId,
      applicationId: dto.applicationId,
      interviewId: dto.interviewId,
      feedbackType: dto.feedbackType,
      rating: dto.rating,
      feedback: dto.feedback,
      isPositive: dto.isPositive,
    });

    return await this.recruiterFeedbackRepository.save(feedback);
  }

  async updateFeedback(
    feedbackId: string,
    candidateId: string,
    dto: UpdateRecruiterFeedbackDto,
  ): Promise<RecruiterFeedback> {
    const feedback = await this.recruiterFeedbackRepository.findOne({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    if (feedback.candidateId !== candidateId) {
      throw new BadRequestException('You can only update your own feedback');
    }

    Object.assign(feedback, dto);
    return await this.recruiterFeedbackRepository.save(feedback);
  }

  async getFeedbackById(feedbackId: string): Promise<RecruiterFeedback> {
    const feedback = await this.recruiterFeedbackRepository.findOne({
      where: { id: feedbackId },
      relations: ['candidate', 'hrUser', 'application', 'interview'],
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return feedback;
  }

  async getRecruiterFeedbacksByCandidate(
    candidateId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{
    data: RecruiterFeedback[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.recruiterFeedbackRepository.findAndCount({
      where: { candidateId },
      relations: ['recruiterUser', 'application', 'interview'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getRecruiterFeedbacksByRecruiter(
    recruiterUserId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{
    data: RecruiterFeedback[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.recruiterFeedbackRepository.findAndCount({
      where: { recruiterUserId },
      relations: ['candidate', 'application', 'interview'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async deleteFeedback(feedbackId: string, candidateId: string): Promise<void> {
    const feedback = await this.recruiterFeedbackRepository.findOne({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    if (feedback.candidateId !== candidateId) {
      throw new BadRequestException('You can only delete your own feedback');
    }

    await this.recruiterFeedbackRepository.remove(feedback);
  }
}
