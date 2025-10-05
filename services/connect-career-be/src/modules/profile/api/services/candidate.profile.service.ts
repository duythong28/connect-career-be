import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CandidateProfile } from '../../domain/entities/candidate-profile.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CandidateProfileService {
  constructor(
    @InjectRepository(CandidateProfile)
    private readonly candidateProfileRepository: Repository<CandidateProfile>,
  ) {}

  async getCandidateProfileById(id: string): Promise<CandidateProfile> {
    const candidateProfile = await this.candidateProfileRepository
      .createQueryBuilder('candidateProfile')
      .leftJoinAndSelect('candidateProfile.user', 'user')
      .leftJoinAndSelect('candidateProfile.primaryIndustry', 'primaryIndustry')
      .leftJoinAndSelect('candidateProfile.workExperiences', 'workExperiences')
      .leftJoinAndSelect('candidateProfile.educations', 'educations')
      .leftJoinAndSelect('candidateProfile.projects', 'projects')
      .leftJoinAndSelect('candidateProfile.certifications', 'certifications')
      .leftJoinAndSelect('candidateProfile.awards', 'awards')
      .leftJoinAndSelect('candidateProfile.publications', 'publications')
      .where('candidateProfile.id = :id', { id })
      .getOne();
    if (!candidateProfile) {
      throw new NotFoundException('Candidate profile not found');
    }
    return candidateProfile;
  }

  async getCandidateProfileByUserId(userId: string): Promise<CandidateProfile> {
    const candidateProfile = await this.candidateProfileRepository
      .createQueryBuilder('candidateProfile')
      .leftJoinAndSelect('candidateProfile.user', 'user')
      .leftJoinAndSelect('candidateProfile.workExperiences', 'workExperiences')
      .leftJoinAndSelect('candidateProfile.educations', 'educations')
      .leftJoinAndSelect('candidateProfile.projects', 'projects')
      .leftJoinAndSelect('candidateProfile.certifications', 'certifications')
      .leftJoinAndSelect('candidateProfile.awards', 'awards')
      .leftJoinAndSelect('candidateProfile.publications', 'publications')
      .where('candidateProfile.userId = :userId', { userId })
      .getOne();
    if (!candidateProfile) {
      throw new NotFoundException('Candidate profile not found');
    }
    return candidateProfile;
  }
}
