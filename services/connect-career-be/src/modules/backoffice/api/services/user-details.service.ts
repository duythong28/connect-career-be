import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/identity/domain/entities/user.entity';
import { CandidateProfile } from 'src/modules/profile/domain/entities/candidate-profile.entity';
import { OrganizationMembership } from 'src/modules/profile/domain/entities/organization-memberships.entity';

@Injectable()
export class UserDetailsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CandidateProfile)
    private readonly candidateProfileRepository: Repository<CandidateProfile>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
  ) {}

  async getUserDetails(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions', 'candidateProfile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const candidateProfile = await this.candidateProfileRepository.findOne({
      where: { userId },
      relations: [
        'user',
        'primaryIndustry',
        'workExperiences',
        'educations',
        'projects',
        'certifications',
        'awards',
        'publications',
      ],
    });

    const organizationMemberships = await this.membershipRepository.find({
      where: { userId },
      relations: [
        'organization',
        'organization.logoFile',
        'organization.bannerFile',
        'organization.industry',
        'role',
        'role.permissions',
      ],
      order: { createdAt: 'DESC' },
    });

    return {
      user,
      candidateProfile: candidateProfile || null,
      organizationMemberships,
    };
  }
}
