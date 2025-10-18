import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offer, OfferStatus } from '../../domain/entities/offer.entity';
import {
  Application,
  ApplicationStatus,
} from '../../domain/entities/application.entity';
import {
  CreateOfferDto,
  UpdateOfferDto,
  RecordOfferResponseDto,
} from '../dtos/offer.dto';
import { Job, JobStatus } from 'src/modules/jobs/domain/entities/job.entity';

@Injectable()
export class OfferService {
  constructor(
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
  ) {}

  async getOffersByApplication(applicationId: string): Promise<Offer[]> {
    return this.offerRepository.find({
      where: { applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getOfferById(id: string): Promise<Offer> {
    const offer = await this.offerRepository.findOne({
      where: { id },
      relations: ['application'],
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    return offer;
  }

  async updateOffer(
    id: string,
    updateDto: UpdateOfferDto,
  ): Promise<Offer | null> {
    const offer = await this.offerRepository.findOne({ where: { id } });
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Can only update pending offers');
    }

    await this.offerRepository.update(id, updateDto);
    return this.offerRepository.findOne({ where: { id } });
  }

  async cancelOffer(id: string, reason: string): Promise<Offer | null> {
    const offer = await this.offerRepository.findOne({ where: { id } });
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    await this.offerRepository.update(id, {
      status: OfferStatus.CANCELLED,
    });

    return this.offerRepository.findOne({ where: { id } });
  }

  async recordCandidateResponse(
    id: string,
    responseDto: RecordOfferResponseDto,
  ): Promise<Offer | null> {
    const offer = await this.offerRepository.findOne({
      where: { id },
      relations: ['application', 'application.job'],
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException(
        'Can only record response for pending offers',
      );
    }

    await this.offerRepository.update(id, {
      status: responseDto.response,
    });

    // Update application status based on offer response
    await this.handleOfferResponse(offer, responseDto);

    return this.offerRepository.findOne({ where: { id } });
  }

  private async handleOfferResponse(
    offer: Offer,
    responseDto: RecordOfferResponseDto,
  ): Promise<void> {
    const application = offer.application;
    let newStatus: ApplicationStatus;

    switch (responseDto.response) {
      case OfferStatus.ACCEPTED:
        newStatus = ApplicationStatus.OFFER_ACCEPTED;
        break;
      case OfferStatus.REJECTED:
        newStatus = ApplicationStatus.OFFER_REJECTED;
        break;
      case OfferStatus.NEGOTIATING:
        newStatus = ApplicationStatus.NEGOTIATING;
        break;
      default:
        return;
    }

    await this.applicationRepository.update(offer.applicationId, {
      status: newStatus,
      lastStatusChange: new Date(),
      daysInCurrentStatus: 0,
    });

    // Add to status history
    const statusHistory = application.statusHistory || [];
    statusHistory.push({
      status: newStatus,
      changedAt: new Date(),
      changedBy: responseDto.recordedBy,
      reason: `Offer ${responseDto.response}`,
      notes: responseDto.candidateNotes,
    });

    await this.applicationRepository.update(offer.applicationId, {
      statusHistory,
    });

    if (responseDto.response === OfferStatus.ACCEPTED) {
      await this.checkAndCloseJob(application.jobId);
    }
  }

  private async checkAndCloseJob(jobId: string): Promise<void> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) return;
    const hiredApplications = await this.applicationRepository.count({
      where: {
        jobId,
        status: ApplicationStatus.HIRED,
      },
    });

    if (job.applicationsLimit && hiredApplications >= job.applicationsLimit) {
      await this.jobRepository.update(jobId, {
        status: JobStatus.CLOSED,
        closedDate: new Date(),
      });
    }
  }

  async createOffer(
    applicationId: string,
    createDto: CreateOfferDto,
  ): Promise<Offer> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['job'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.job.status !== JobStatus.ACTIVE) {
      throw new BadRequestException('Cannot create offer for inactive job');
    }

    const offer = this.offerRepository.create({
      ...createDto,
      applicationId,
      status: OfferStatus.PENDING,
    });

    const savedOffer = await this.offerRepository.save(offer);

    await this.applicationRepository.update(applicationId, {
      currentOfferId: savedOffer.id,
      status: ApplicationStatus.OFFER_SENT,
      lastStatusChange: new Date(),
      daysInCurrentStatus: 0,
    });

    const statusHistory = application.statusHistory || [];
    statusHistory.push({
      status: ApplicationStatus.OFFER_SENT,
      changedAt: new Date(),
      changedBy: createDto.offeredBy,
      reason: 'Offer sent to candidate',
      notes: createDto.notes,
    });

    await this.applicationRepository.update(applicationId, {
      statusHistory,
    });

    return savedOffer;
  }
}
