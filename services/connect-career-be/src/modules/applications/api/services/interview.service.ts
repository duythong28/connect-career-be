import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Interview,
  InterviewStatus,
} from '../../domain/entities/interview.entity';
import {
  Application,
  ApplicationStatus,
} from '../../domain/entities/application.entity';
import {
  CreateInterviewDto,
  UpdateInterviewDto,
  SubmitInterviewFeedbackDto,
  RescheduleInterviewDto,
} from '../dtos/interview.dto';

@Injectable()
export class InterviewService {
  constructor(
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {}

  async scheduleInterview(
    applicationId: string,
    createDto: CreateInterviewDto,
  ): Promise<Interview> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const interview = this.interviewRepository.create({
      ...createDto,
      date: new Date(createDto.scheduledDate),
      applicationId,
      status: InterviewStatus.SCHEDULED,
    });

    const savedInterview = await this.interviewRepository.save(interview);

    await this.applicationRepository.update(applicationId, {
      totalInterviews: () => 'totalInterviews + 1',
    });

    return savedInterview;
  }

  async getInterviewsByApplication(
    applicationId: string,
  ): Promise<Interview[]> {
    return this.interviewRepository.find({
      where: { applicationId },
      order: { scheduledDate: 'DESC' },
    });
  }

  async getInterviewById(id: string): Promise<Interview | null> {
    const interview = await this.interviewRepository.findOne({
      where: { id },
      relations: ['application'],
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    return interview;
  }

  async updateInterview(
    id: string,
    updateDto: UpdateInterviewDto,
  ): Promise<Interview | null> {
    const interview = await this.interviewRepository.findOne({ where: { id } });
    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    await this.interviewRepository.update(id, updateDto);
    return this.interviewRepository.findOne({ where: { id } });
  }

  async rescheduleInterview(
    id: string,
    rescheduleDto: RescheduleInterviewDto,
  ): Promise<Interview | null> {
    const interview = await this.interviewRepository.findOne({ where: { id } });
    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    await this.interviewRepository.update(id, {
      scheduledDate: new Date(rescheduleDto.newScheduledDate),
      status: InterviewStatus.RESCHEDULED,
    });

    return this.interviewRepository.findOne({ where: { id } });
  }

  async submitFeedback(
    id: string,
    feedbackDto: SubmitInterviewFeedbackDto,
  ): Promise<Interview | null> {
    const interview = await this.interviewRepository.findOne({
      where: { id },
      relations: ['application'],
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    if (interview.status !== InterviewStatus.SCHEDULED) {
      throw new BadRequestException(
        'Can only submit feedback for scheduled interviews',
      );
    }

    const feedback = {
      rating: feedbackDto.rating,
      recommendation: feedbackDto.recommendation,
      strengths: feedbackDto.strengths,
      weaknesses: feedbackDto.weaknesses,
      comments: feedbackDto.comments,
    };

    await this.interviewRepository.update(id, {
      feedback,
      status: InterviewStatus.COMPLETED,
      completedAt: new Date(),
    });

    await this.applicationRepository.update(interview.applicationId, {
      completedInterviews: () => 'completedInterviews + 1',
    });

    await this.handleInterviewFeedback(interview.applicationId, feedback);

    return this.interviewRepository.findOne({ where: { id } });
  }

  private async handleInterviewFeedback(
    applicationId: string,
    feedback: any,
  ): Promise<void> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['job'],
    });

    if (!application) return;

    let newStatus: ApplicationStatus;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    switch (feedback.recommendation) {
      case 'strongly_recommend':
      case 'recommend': {
        const totalInterviews = application.totalInterviews;
        const completedInterviews = application.completedInterviews + 1;

        if (completedInterviews >= totalInterviews) {
          newStatus = ApplicationStatus.INTERVIEW_COMPLETED;
        } else {
          newStatus = ApplicationStatus.INTERVIEW_IN_PROGRESS;
        }
        break;
      }

      case 'not_recommend':
        newStatus = ApplicationStatus.REJECTED;
        break;

      case 'neutral':
      default:
        newStatus = ApplicationStatus.INTERVIEW_COMPLETED;
        break;
    }

    // Update application status
    if (newStatus !== application.status) {
      await this.applicationRepository.update(applicationId, {
        status: newStatus,
        lastStatusChange: new Date(),
        daysInCurrentStatus: 0,
      });

      // Add to status history
      const statusHistory = application.statusHistory || [];
      statusHistory.push({
        status: newStatus,
        changedAt: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        changedBy: feedback.submittedBy || 'System',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        reason: `Interview feedback: ${feedback.recommendation}`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        notes: feedback.comments,
      });

      await this.applicationRepository.update(applicationId, {
        statusHistory,
      });
    }
  }

  async cancelInterview(id: string, reason: string): Promise<Interview | null> {
    const interview = await this.interviewRepository.findOne({
      where: { id },
      relations: ['application'],
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    await this.interviewRepository.update(id, {
      status: InterviewStatus.CANCELLED,
      cancellationReason: reason,
      cancelledAt: new Date(),
    });

    // Check if this was the only scheduled interview
    const application = await this.applicationRepository.findOne({
      where: { id: interview.applicationId },
    });

    if (application && application.totalInterviews === 1) {
      // If this was the only interview, move application back to screening
      await this.applicationRepository.update(interview.applicationId, {
        status: ApplicationStatus.SCREENING,
        lastStatusChange: new Date(),
        daysInCurrentStatus: 0,
      });
    }

    return this.interviewRepository.findOne({ where: { id } });
  }
}
