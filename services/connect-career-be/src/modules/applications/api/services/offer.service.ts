import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Offer,
  OfferStatus,
  OfferType,
} from '../../domain/entities/offer.entity';
import {
  Application,
  ApplicationStatus,
} from '../../domain/entities/application.entity';
import {
  CreateOfferDto,
  UpdateOfferDto,
  RecordOfferResponseDto,
  CreateOfferCandidateDto,
  CounterOfferDto,
  AcceptOfferDto,
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

  async getLatestOffer(applicationId: string): Promise<Offer | null> {
    return this.offerRepository.findOne({
      where: { applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  private isOfferOwner(offer: Offer, userId: string): boolean {
    return offer.offeredBy === userId;
  }

  private isOppositeParty(
    offer: Offer,
    application: Application,
    userId: string,
  ): boolean {
    if (offer.isOfferedByCandidate) {
      return application.candidateId !== userId;
    } else {
      return application.candidateId === userId;
    }
  }

  private verifyOfferAccess(
    offer: Offer,
    application: Application,
    userId: string,
    requireOwner: boolean = false,
  ): void {
    const isOwner = this.isOfferOwner(offer, userId);
    const isOpposite = this.isOppositeParty(offer, application, userId);

    if (requireOwner && !isOwner) {
      throw new ForbiddenException('Only offer owner can perform this action');
    }

    if (!isOwner && !isOpposite) {
      throw new ForbiddenException('User is not authorized for this offer');
    }
  }

  async createCounterOffer(
    applicationId: string,
    counterDto: CounterOfferDto,
    userId: string,
  ): Promise<Offer | null> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['job'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Get latest offer
    const latestOffer = await this.getLatestOffer(applicationId);
    if (!latestOffer) {
      throw new BadRequestException('No offer found to counter');
    }

    // Verify user is opposite party
    this.verifyOfferAccess(latestOffer, application, userId);

    if (!latestOffer.isNegotiable) {
      throw new BadRequestException(
        'Cannot counter offer: latest offer is not negotiable',
      );
    }

    if (!latestOffer.isActive()) {
      throw new BadRequestException(
        'Cannot counter offer: latest offer is not active',
      );
    }
    const isFromCandidate = application.candidateId === userId;

    await this.offerRepository.update(latestOffer.id, {
      status: OfferStatus.REJECTED,
      rejectedDate: new Date(),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const newOffer = this.offerRepository.create({
      ...counterDto,
      applicationId,
      offeredBy: userId,
      status: OfferStatus.PENDING,
      offerType: OfferType.COUNTER,
      isOfferedByCandidate: isFromCandidate,
      previousOfferId: latestOffer.id,
      rootOfferId: latestOffer.rootOfferId || latestOffer.id,
      version: latestOffer.version + 1,
      negotiationRounds: latestOffer.negotiationRounds + 1,
    });

    const savedOffer = await this.offerRepository.save(newOffer);

    // Update application with new latest offer
    await this.applicationRepository.update(applicationId, {
      currentOfferId: savedOffer.id,
      status: ApplicationStatus.NEGOTIATING,
      lastStatusChange: new Date(),
      daysInCurrentStatus: 0,
    });

    // Update status history
    const statusHistory = application.statusHistory || [];
    statusHistory.push({
      status: ApplicationStatus.NEGOTIATING,
      changedAt: new Date(),
      changedBy: userId,
      reason: 'Counter offer created',
      notes: counterDto.notes,
    });

    await this.applicationRepository.update(applicationId, {
      statusHistory,
    });
    return savedOffer;
  }

  async acceptOffer(
    applicationId: string,
    acceptDto: AcceptOfferDto,
    userId: string,
  ): Promise<Offer | null> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['job'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const latestOffer = await this.getLatestOffer(applicationId);
    if (!latestOffer) {
      throw new NotFoundException('No offer found');
    }

    // Only opposite party can accept
    if (this.isOfferOwner(latestOffer, userId)) {
      throw new ForbiddenException('Offer owner cannot accept their own offer');
    }

    if (!latestOffer.isPending()) {
      throw new BadRequestException('Can only accept pending offers');
    }

    // Update offer status
    await this.offerRepository.update(latestOffer.id, {
      status: OfferStatus.ACCEPTED,
      acceptedDate: new Date(),
    });

    // Update application status
    await this.applicationRepository.update(applicationId, {
      status: ApplicationStatus.OFFER_ACCEPTED,
      lastStatusChange: new Date(),
      daysInCurrentStatus: 0,
    });
    const statusHistory = application.statusHistory || [];
    statusHistory.push({
      status: ApplicationStatus.OFFER_ACCEPTED,
      changedAt: new Date(),
      changedBy: userId,
      reason: 'Offer accepted',
      notes: acceptDto.notes,
    });

    await this.applicationRepository.update(applicationId, {
      statusHistory,
    });

    // Check if job should be closed
    await this.checkAndCloseJob(application.jobId);

    return this.offerRepository.findOne({ where: { id: latestOffer.id } });
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
    userId: string,
  ): Promise<Offer | null> {
    const offer = await this.offerRepository.findOne({
      where: { id },
      relations: ['application'],
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (!this.isOfferOwner(offer, userId)) {
      throw new ForbiddenException('Only offer owner can update');
    }

    if (!offer.isPending()) {
      throw new BadRequestException('Can only update pending offers');
    }

    await this.offerRepository.update(id, updateDto);
    return this.offerRepository.findOne({ where: { id } });
  }

  async deleteOffer(id: string, userId: string): Promise<void> {
    const offer = await this.offerRepository.findOne({ where: { id } });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    // Verify user is owner
    if (!this.isOfferOwner(offer, userId)) {
      throw new ForbiddenException('Only offer owner can delete');
    }

    if (offer.status === OfferStatus.PENDING) {
      throw new BadRequestException(
        'Cannot delete pending offers. Cancel them instead.',
      );
    }

    await this.offerRepository.delete(id);
  }

  async cancelOffer(
    id: string,
    reason: string,
    userId: string,
  ): Promise<Offer | null> {
    const offer = await this.offerRepository.findOne({ where: { id } });
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (!this.isOfferOwner(offer, userId)) {
      throw new ForbiddenException('Only offer owner can cancel');
    }

    await this.offerRepository.update(id, {
      status: OfferStatus.CANCELLED,
      cancelledDate: new Date(),
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

  async createOfferByCandidate(
    applicationId: string,
    createDto: CreateOfferCandidateDto,
    candidateId: string,
  ): Promise<Offer> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.candidateId !== candidateId) {
      throw new ForbiddenException('Application does not belong to candidate');
    }

    const createOfferDto: CreateOfferCandidateDto = {
      ...createDto,
      offeredBy: candidateId,
      isOfferedByCandidate: true,
    };
    return this.createOffer(applicationId, createOfferDto);
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

    const latestOffer = await this.getLatestOffer(applicationId);
    let offerType = OfferType.INITIAL;
    let version = 1;
    let previousOfferId: string | undefined;
    let rootOfferId: string | undefined;

    if (latestOffer) {
      offerType = OfferType.REVISED;
      version = latestOffer.version + 1;
      previousOfferId = latestOffer.id;
      rootOfferId = latestOffer.rootOfferId || latestOffer.id;
    }

    const isOfferedByCandidate = createDto.offeredBy === application.candidateId;

    const offer = this.offerRepository.create({
      ...createDto,
      applicationId,
      status: OfferStatus.PENDING,
      offerType,
      version,
      previousOfferId,
      rootOfferId,
      isOfferedByCandidate,
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
      reason: isOfferedByCandidate ? 'Offer sent by candidate' : 'Offer sent to candidate',
      notes: createDto.notes,
    });

    await this.applicationRepository.update(applicationId, {
      statusHistory,
    });

    return savedOffer;
  }
}
