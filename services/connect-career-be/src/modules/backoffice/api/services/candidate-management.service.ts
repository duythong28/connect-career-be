import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateProfile } from 'src/modules/profile/domain/entities/candidate-profile.entity';
import { User } from 'src/modules/identity/domain/entities';
import { Application } from 'src/modules/applications/domain/entities/application.entity';
import { Interview } from 'src/modules/applications/domain/entities/interview.entity';
import { Offer } from 'src/modules/applications/domain/entities/offer.entity';
import {
  CandidateListQueryDto,
  UpdateCandidateStatusDto,
} from '../dtos/candidate-management.dto';

@Injectable()
export class CandidateManagementService {
  constructor(
    @InjectRepository(CandidateProfile)
    private readonly candidateProfileRepository: Repository<CandidateProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
  ) {}

  async getCandidates(query: CandidateListQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.candidateProfileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user');

    if (query.search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR profile.email ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.completionStatus) {
      queryBuilder.andWhere('profile.completionStatus = :status', {
        status: query.completionStatus,
      });
    }

    const [data, total] = await queryBuilder
      .orderBy('profile.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCandidateById(candidateId: string): Promise<CandidateProfile> {
    const profile = await this.candidateProfileRepository.findOne({
      where: { id: candidateId },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException('Candidate profile not found');
    }
    return profile;
  }

  async updateCandidateStatus(
    candidateId: string,
    updateDto: UpdateCandidateStatusDto,
  ): Promise<CandidateProfile> {
    const profile = await this.candidateProfileRepository.findOne({
      where: { id: candidateId },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException('Candidate profile not found');
    }

    if (updateDto.completionStatus) {
      profile.completionStatus = updateDto.completionStatus;
    }

    await this.candidateProfileRepository.save(profile);

    return profile;
  }
}
