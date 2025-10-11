import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CandidateProfile } from '../../domain/entities/candidate-profile.entity';
import {
  EmploymentType,
  WorkExperience,
} from '../../domain/entities/work-experience.entity';
import { Education } from '../../domain/entities/education.entity';
import { Project, ProjectStatus } from '../../domain/entities/project.entity';
import { Certification } from '../../domain/entities/certification.entity';
import { Award } from '../../domain/entities/award.entity';
import { Repository, DataSource } from 'typeorm';
import {
  Organization,
  OrganizationSize,
  OrganizationType,
} from '../../domain/entities/organization.entity';
import {
  CreateCandidateProfileDto,
  UpdateCandidateProfileDto,
} from '../dtos/candidate-profile.dto';
import { QueryRunner } from 'typeorm/browser';
import { User } from 'src/modules/identity/domain/entities';
import { Industry } from '../../domain/entities/industry.entity';

@Injectable()
export class CandidateProfileService {
  constructor(
    @InjectRepository(CandidateProfile)
    private readonly candidateProfileRepository: Repository<CandidateProfile>,
    @InjectRepository(WorkExperience)
    private readonly workExperienceRepository: Repository<WorkExperience>,
    @InjectRepository(Education)
    private readonly educationRepository: Repository<Education>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Certification)
    private readonly certificationRepository: Repository<Certification>,
    @InjectRepository(Award)
    private readonly awardRepository: Repository<Award>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly dataSource: DataSource,
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

  async createCandidateProfile(
    dto: CreateCandidateProfileDto,
  ): Promise<CandidateProfile> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await this.candidateProfileRepository.findOne({
        where: { userId: dto.userId },
      });
      if (existing) {
        throw new BadRequestException(
          'Candidate profile already exists for this user',
        );
      }

      const profile = this.candidateProfileRepository.create({
        userId: dto.userId,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        country: dto.country,
        primaryIndustryId: dto.primaryIndustryId,
        skills: dto.skills || [],
        languages: dto.languages || [],
        socialLinks: dto.socialLinks,
      });

      const savedProfile = await queryRunner.manager.save(profile);

      if (dto.workExperiences && dto.workExperiences.length > 0) {
        for (const expDto of dto.workExperiences) {
          const org = await this.findOrCreateOrganization(
            expDto.organizationName,
            queryRunner,
          );

          const experience = this.workExperienceRepository.create({
            candidateProfileId: savedProfile.id,
            jobTitle: expDto.jobTitle,
            organizationId: org.id,
            employmentType: expDto.employmentType || EmploymentType.FULL_TIME,
            location: expDto.location,
            startDate: new Date(expDto.startDate),
            endDate: expDto.endDate ? new Date(expDto.endDate) : undefined,
            isCurrent: expDto.isCurrent || false,
            description: expDto.description,
            skills: expDto.skills || [],
          });
          await queryRunner.manager.save(experience);
        }
      }

      if (dto.educations && dto.educations.length > 0) {
        const educations = dto.educations.map((eduDto) =>
          this.educationRepository.create({
            candidateProfileId: savedProfile.id,
            institutionName: eduDto.institutionName,
            degreeType: eduDto.degreeType,
            fieldOfStudy: eduDto.fieldOfStudy,
            location: eduDto.location,
            startDate: eduDto.startDate
              ? new Date(eduDto.startDate)
              : undefined,
            graduationDate: eduDto.graduationDate
              ? new Date(eduDto.graduationDate)
              : undefined,
            isCurrent: eduDto.isCurrent || false,
            description: eduDto.description,
            coursework: eduDto.coursework || [],
            honors: eduDto.honors || [],
          }),
        );
        await queryRunner.manager.save(educations);
      }

      if (dto.projects && dto.projects.length > 0) {
        const projects = dto.projects.map((projDto) => {
          const newProject = {
            candidateProfileId: savedProfile.id,
            title: projDto.title,
            name: projDto.name,
            description: projDto.description,
            status: projDto.status || ProjectStatus.COMPLETED,
            role: projDto.role,
            startDate: projDto.startDate
              ? new Date(projDto.startDate)
              : undefined,
            endDate: projDto.endDate ? new Date(projDto.endDate) : undefined,
            isCurrent: projDto.isCurrent || false,
            technologies: projDto.technologies || [],
            features: projDto.features || [],
            projectUrl: projDto.projectUrl,
            repositoryUrl: projDto.repositoryUrl,
          };
          return this.projectRepository.create(newProject);
        });
        await queryRunner.manager.save(projects);
      }

      // Handle certifications
      if (dto.certifications && dto.certifications.length > 0) {
        const certifications = dto.certifications.map((certDto) =>
          this.certificationRepository.create({
            candidateProfileId: savedProfile.id,
            name: certDto.name,
            issuingOrganization: certDto.issuingOrganization,
            issueDate: certDto.issueDate
              ? new Date(certDto.issueDate)
              : undefined,
            expiryDate: certDto.expiryDate
              ? new Date(certDto.expiryDate)
              : undefined,
            credentialId: certDto.credentialId,
            credentialUrl: certDto.credentialUrl,
          }),
        );
        await queryRunner.manager.save(certifications);
      }

      // Handle awards
      if (dto.awards && dto.awards.length > 0) {
        const awards = dto.awards.map((awardDto) =>
          this.awardRepository.create({
            candidateProfileId: savedProfile.id,
            title: awardDto.title,
            issuer: awardDto.issuer,
            dateReceived: awardDto.dateReceived
              ? new Date(awardDto.dateReceived)
              : undefined,
            description: awardDto.description,
          }),
        );
        await queryRunner.manager.save(awards);
      }

      // Calculate completion percentage
      savedProfile.calculateCompletionPercentage();
      await queryRunner.manager.save(savedProfile);

      await queryRunner.commitTransaction();

      // Return full profile
      return this.getCandidateProfileById(savedProfile.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateCandidateProfile(
    userId: string,
    dto: UpdateCandidateProfileDto,
  ): Promise<CandidateProfile> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const profile = await this.candidateProfileRepository.findOne({
        where: { userId },
      });

      if (!profile) {
        throw new NotFoundException('Candidate profile not found');
      }

      // Update basic fields
      if (dto.email !== undefined) profile.email = dto.email;
      if (dto.phone !== undefined) profile.phone = dto.phone;
      if (dto.address !== undefined) profile.address = dto.address;
      if (dto.city !== undefined) profile.city = dto.city;
      if (dto.country !== undefined) profile.country = dto.country;
      if (dto.primaryIndustryId !== undefined)
        profile.primaryIndustryId = dto.primaryIndustryId;
      if (dto.skills !== undefined) profile.skills = dto.skills;
      if (dto.languages !== undefined) profile.languages = dto.languages;
      if (dto.socialLinks !== undefined) profile.socialLinks = dto.socialLinks;

      await queryRunner.manager.save(profile);

      // Update work experiences (replace all)
      if (dto.workExperiences !== undefined) {
        // Delete existing
        await queryRunner.manager.delete(WorkExperience, {
          candidateProfileId: profile.id,
        });

        // Create new ones
        for (const expDto of dto.workExperiences) {
          const org = await this.findOrCreateOrganization(
            expDto.organizationName,
            queryRunner,
          );

          const experience = this.workExperienceRepository.create({
            candidateProfile: profile,
            candidateProfileId: profile.id,
            jobTitle: expDto.jobTitle,
            organizationId: org.id,
            employmentType: expDto.employmentType || EmploymentType.FULL_TIME,
            location: expDto.location,
            startDate: new Date(expDto.startDate),
            endDate: expDto.endDate ? new Date(expDto.endDate) : undefined,
            isCurrent: expDto.isCurrent || false,
            description: expDto.description,
            skills: expDto.skills || [],
          });
          await queryRunner.manager.save(experience);
        }
      }

      // Update educations (replace all)
      if (dto.educations !== undefined) {
        await queryRunner.manager.delete(Education, {
          candidateProfileId: profile.id,
        });

        const educations = dto.educations.map((eduDto) =>
          this.educationRepository.create({
            candidateProfile: profile,
            candidateProfileId: profile.id,
            institutionName: eduDto.institutionName,
            degreeType: eduDto.degreeType,
            fieldOfStudy: eduDto.fieldOfStudy,
            location: eduDto.location,
            startDate: eduDto.startDate
              ? new Date(eduDto.startDate)
              : undefined,
            graduationDate: eduDto.graduationDate
              ? new Date(eduDto.graduationDate)
              : undefined,
            isCurrent: eduDto.isCurrent || false,
            description: eduDto.description,
            coursework: eduDto.coursework || [],
            honors: eduDto.honors || [],
          }),
        );
        await queryRunner.manager.save(educations);
      }

      // Update projects (replace all)
      if (dto.projects !== undefined) {
        await queryRunner.manager.delete(Project, {
          candidateProfileId: profile.id,
        });

        const projects = dto.projects.map((projDto) => {
          const newProject = {
            candidateProfile: profile,
            candidateProfileId: profile.id,
            title: projDto.title,
            name: projDto.name,
            description: projDto.description,
            status: projDto.status || ProjectStatus.COMPLETED,
            role: projDto.role,
            startDate: projDto.startDate
              ? new Date(projDto.startDate)
              : undefined,
            endDate: projDto.endDate ? new Date(projDto.endDate) : undefined,
            isCurrent: projDto.isCurrent || false,
            technologies: projDto.technologies || [],
            features: projDto.features || [],
            projectUrl: projDto.projectUrl,
            repositoryUrl: projDto.repositoryUrl,
          };

          return this.projectRepository.create(newProject);
        });
        await queryRunner.manager.save(projects);
      }
      if (dto.certifications !== undefined) {
        await queryRunner.manager.delete(Certification, {
          candidateProfileId: profile.id,
        });

        const certifications = dto.certifications.map((certDto) =>
          this.certificationRepository.create({
            candidateProfile: profile,
            candidateProfileId: profile.id,
            name: certDto.name,
            issuingOrganization: certDto.issuingOrganization,
            issueDate: certDto.issueDate
              ? new Date(certDto.issueDate)
              : undefined,
            expiryDate: certDto.expiryDate
              ? new Date(certDto.expiryDate)
              : undefined,
            credentialId: certDto.credentialId,
            credentialUrl: certDto.credentialUrl,
          }),
        );
        await queryRunner.manager.save(certifications);
      }

      if (dto.awards !== undefined) {
        await queryRunner.manager.delete(Award, {
          candidateProfileId: profile.id,
        });

        const awards = dto.awards.map((awardDto) =>
          this.awardRepository.create({
            candidateProfile: profile,
            candidateProfileId: profile.id,
            title: awardDto.title,
            issuer: awardDto.issuer,
            dateReceived: awardDto.dateReceived
              ? new Date(awardDto.dateReceived)
              : undefined,
            description: awardDto.description,
          }),
        );
        await queryRunner.manager.save(awards);
      }

      profile.calculateCompletionPercentage();
      await queryRunner.manager.save(profile);

      await queryRunner.commitTransaction();

      return this.getCandidateProfileByUserId(userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async findOrCreateOrganization(
    name: string,
    queryRunner: QueryRunner,
  ): Promise<Organization> {
    let org = await queryRunner.manager.findOne(Organization, {
      where: { name },
    });
    const systemUser = await queryRunner.manager.findOne(User, {
      where: { email: 'system@connect-career.com' },
    });
    const industry = await queryRunner.manager.findOne(Industry, {
      where: { name: 'Other' },
    });

    if (!org) {
      org = this.organizationRepository.create({
        userId: systemUser?.id,
        industryId: industry!.id,
        name,
        organizationType: OrganizationType.OTHER,
        organizationSize: OrganizationSize.STARTUP,
        country: 'Unknown',
        workingDays: [],
        workScheduleTypes: [],
        isPublic: false,
        isActive: false,
        isVerified: false,
      });
      org = await queryRunner.manager.save(org);
    }

    return org;
  }
}
