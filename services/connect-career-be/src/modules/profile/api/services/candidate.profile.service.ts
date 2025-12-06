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
import {
  Offer,
  OfferStatus,
} from 'src/modules/applications/domain/entities/offer.entity';
import {
  Interview,
  InterviewStatus,
} from 'src/modules/applications/domain/entities/interview.entity';
import { Application } from 'src/modules/applications/domain/entities/application.entity';
import { RecruiterFeedback } from '../../domain/entities/recruiter-feedbacks.entity';
import { QueueService } from 'src/shared/infrastructure/queue/queue.service';
import { UserPreferences } from 'src/modules/recommendations/domain/entities/user-preferences.entity';
import { JobInteraction } from 'src/modules/recommendations/domain/entities/job-interaction.entity';
@Injectable()
export class CandidateProfileService {
  constructor(
    @InjectRepository(CandidateProfile)
    private readonly candidateProfileRepository: Repository<CandidateProfile>,
    @InjectRepository(WorkExperience)
    private readonly workExperienceRepository: Repository<WorkExperience>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
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
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    @InjectRepository(RecruiterFeedback)
    private readonly recruiterFeedbackRepository: Repository<RecruiterFeedback>,
    @InjectRepository(UserPreferences)
    private readonly userPreferencesRepository: Repository<UserPreferences>,
    @InjectRepository(JobInteraction)
    private readonly jobInteractionRepository: Repository<JobInteraction>,
    private readonly dataSource: DataSource,
    private readonly queueService: QueueService,
  ) {}

  async getCandidateProfileById(id: string): Promise<any> {
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
    const userId = candidateProfile.userId;
    // Get interview feedbacks (when user is candidate)
    const interviews = await this.interviewRepository
      .createQueryBuilder('interview')
      .leftJoinAndSelect('interview.application', 'application')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('job.organization', 'organization')
      .leftJoinAndSelect('interview.interviewer', 'interviewer')
      .where('application.candidateId = :userId', { userId })
      .andWhere('interview.feedback IS NOT NULL')
      .orderBy('interview.completedAt', 'DESC')
      .addOrderBy('interview.createdAt', 'DESC')
      .getMany();

    // Get application feedbacks (when user is candidate)
    const applications = await this.applicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('job.organization', 'organization')
      .where('application.candidateId = :userId', { userId })
      .andWhere('application.feedback IS NOT NULL')
      .orderBy('application.appliedDate', 'DESC')
      .getMany();

    // Get recruiter feedbacks (when user is recruiter)
    const recruiterFeedbacks = await this.recruiterFeedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.candidate', 'candidate')
      .leftJoinAndSelect('feedback.application', 'application')
      .leftJoinAndSelect('feedback.interview', 'interview')
      .where('feedback.recruiterUserId = :userId', { userId })
      .orderBy('feedback.createdAt', 'DESC')
      .getMany();

    return {
      ...candidateProfile,
      interviewFeedbacks: interviews.map((interview) => ({
        id: interview.id,
        applicationId: interview.applicationId,
        job: interview.application?.job
          ? {
              id: interview.application.job.id,
              title: interview.application.job.title,
              organization: interview.application.job.organization
                ? {
                    id: interview.application.job.organization.id,
                    name: interview.application.job.organization.name,
                  }
                : null,
            }
          : null,
        type: interview.type,
        status: interview.status,
        scheduledDate: interview.scheduledDate,
        date: interview.date,
        interviewer: interview.interviewer
          ? {
              id: interview.interviewer.id,
              fullName: interview.interviewer.fullName,
              email: interview.interviewer.email,
            }
          : null,
        interviewerName: interview.interviewerName,
        feedback: interview.feedback,
        notes: interview.notes,
        completedAt: interview.completedAt,
        createdAt: interview.createdAt,
      })),
      userFeedbacks: {
        receivedAsCandidate: {
          interviewFeedbacks: interviews.map((interview) => ({
            id: interview.id,
            interviewId: interview.id,
            applicationId: interview.applicationId,
            job: interview.application?.job
              ? {
                  id: interview.application.job.id,
                  title: interview.application.job.title,
                  organization: interview.application.job.organization
                    ? {
                        id: interview.application.job.organization.id,
                        name: interview.application.job.organization.name,
                      }
                    : undefined,
                }
              : undefined,
            interviewer: interview.interviewer
              ? {
                  id: interview.interviewer.id,
                  fullName: interview.interviewer.fullName,
                  email: interview.interviewer.email,
                }
              : undefined,
            feedback: interview.feedback,
            scheduledDate: interview.scheduledDate,
            completedAt: interview.completedAt,
            createdAt: interview.createdAt,
          })),
          applicationFeedbacks: applications.map((application) => ({
            id: application.id,
            applicationId: application.id,
            job: application.job
              ? {
                  id: application.job.id,
                  title: application.job.title,
                  organization: application.job.organization
                    ? {
                        id: application.job.organization.id,
                        name: application.job.organization.name,
                      }
                    : undefined,
                }
              : undefined,
            feedback: application.feedback,
            appliedDate: application.appliedDate,
            status: application.status,
          })),
        },
        givenAsRecruiter: {
          recruiterFeedbacks: recruiterFeedbacks.map((feedback) => ({
            id: feedback.id,
            candidateId: feedback.candidateId,
            candidate: feedback.candidate
              ? {
                  id: feedback.candidate.id,
                  fullName: feedback.candidate.fullName,
                  email: feedback.candidate.email,
                }
              : undefined,
            applicationId: feedback.applicationId,
            interviewId: feedback.interviewId,
            feedbackType: feedback.feedbackType,
            rating: feedback.rating,
            feedback: feedback.feedback,
            isPositive: feedback.isPositive,
            createdAt: feedback.createdAt,
          })),
        },
        totals: {
          receivedAsCandidate: interviews.length + applications.length,
          givenAsRecruiter: recruiterFeedbacks.length,
        },
      },
    };
  }

  async getCandidateProfileByUserId(userId: string): Promise<any> {
    const candidateProfile = await this.candidateProfileRepository
      .createQueryBuilder('candidateProfile')
      .leftJoinAndSelect('candidateProfile.user', 'user')
      .leftJoinAndSelect('candidateProfile.workExperiences', 'workExperiences')
      .leftJoinAndSelect('workExperiences.organization', 'organization')
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
    // Get interview feedbacks (when user is candidate)
    const interviews = await this.interviewRepository
      .createQueryBuilder('interview')
      .leftJoinAndSelect('interview.application', 'application')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('job.organization', 'organization')
      .leftJoinAndSelect('interview.interviewer', 'interviewer')
      .where('application.candidateId = :userId', { userId })
      .andWhere('interview.feedback IS NOT NULL')
      .orderBy('interview.completedAt', 'DESC')
      .addOrderBy('interview.createdAt', 'DESC')
      .getMany();

    // Get application feedbacks (when user is candidate)
    const applications = await this.applicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('job.organization', 'organization')
      .where('application.candidateId = :userId', { userId })
      .andWhere('application.feedback IS NOT NULL')
      .orderBy('application.appliedDate', 'DESC')
      .getMany();

    // Get recruiter feedbacks (when user is recruiter)
    const recruiterFeedbacks = await this.recruiterFeedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.candidate', 'candidate')
      .leftJoinAndSelect('feedback.application', 'application')
      .leftJoinAndSelect('feedback.interview', 'interview')
      .where('feedback.recruiterUserId = :userId', { userId })
      .orderBy('feedback.createdAt', 'DESC')
      .getMany();

    return {
      ...candidateProfile,
      interviewFeedbacks: interviews.map((interview) => ({
        id: interview.id,
        applicationId: interview.applicationId,
        job: interview.application?.job
          ? {
              id: interview.application.job.id,
              title: interview.application.job.title,
              organization: interview.application.job.organization
                ? {
                    id: interview.application.job.organization.id,
                    name: interview.application.job.organization.name,
                  }
                : null,
            }
          : null,
        type: interview.type,
        status: interview.status,
        scheduledDate: interview.scheduledDate,
        date: interview.date,
        interviewer: interview.interviewer
          ? {
              id: interview.interviewer.id,
              fullName: interview.interviewer.fullName,
              email: interview.interviewer.email,
            }
          : null,
        interviewerName: interview.interviewerName,
        feedback: interview.feedback,
        notes: interview.notes,
        completedAt: interview.completedAt,
        createdAt: interview.createdAt,
      })),
      userFeedbacks: {
        receivedAsCandidate: {
          interviewFeedbacks: interviews.map((interview) => ({
            id: interview.id,
            interviewId: interview.id,
            applicationId: interview.applicationId,
            job: interview.application?.job
              ? {
                  id: interview.application.job.id,
                  title: interview.application.job.title,
                  organization: interview.application.job.organization
                    ? {
                        id: interview.application.job.organization.id,
                        name: interview.application.job.organization.name,
                      }
                    : undefined,
                }
              : undefined,
            interviewer: interview.interviewer
              ? {
                  id: interview.interviewer.id,
                  fullName: interview.interviewer.fullName,
                  email: interview.interviewer.email,
                }
              : undefined,
            feedback: interview.feedback,
            scheduledDate: interview.scheduledDate,
            completedAt: interview.completedAt,
            createdAt: interview.createdAt,
          })),
          applicationFeedbacks: applications.map((application) => ({
            id: application.id,
            applicationId: application.id,
            job: application.job
              ? {
                  id: application.job.id,
                  title: application.job.title,
                  organization: application.job.organization
                    ? {
                        id: application.job.organization.id,
                        name: application.job.organization.name,
                      }
                    : undefined,
                }
              : undefined,
            feedback: application.feedback,
            appliedDate: application.appliedDate,
            status: application.status,
          })),
        },
        givenAsRecruiter: {
          recruiterFeedbacks: recruiterFeedbacks.map((feedback) => ({
            id: feedback.id,
            candidateId: feedback.candidateId,
            candidate: feedback.candidate
              ? {
                  id: feedback.candidate.id,
                  fullName: feedback.candidate.fullName,
                  email: feedback.candidate.email,
                }
              : undefined,
            applicationId: feedback.applicationId,
            interviewId: feedback.interviewId,
            feedbackType: feedback.feedbackType,
            rating: feedback.rating,
            feedback: feedback.feedback,
            isPositive: feedback.isPositive,
            createdAt: feedback.createdAt,
          })),
        },
        totals: {
          receivedAsCandidate: interviews.length + applications.length,
          givenAsRecruiter: recruiterFeedbacks.length,
        },
      },
    };
  }

  async createCandidateProfile(
    dto: CreateCandidateProfileDto,
  ): Promise<boolean> {
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
      await this.queueUserEmbedding(dto.userId);

      // Return full profile
      return true;
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
  ): Promise<any> {
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
            description: certDto.description,
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
      if (
        dto.skills ||
        dto.languages ||
        dto.workExperiences ||
        dto.educations
      ) {
        await this.queueUserEmbedding(userId);
      }
  
      return await this.getCandidateProfileByUserId(userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async queueUserEmbedding(userId: string): Promise<void> {
    // Fetch complete user data for embedding
    const profile = await this.candidateProfileRepository.findOne({
      where: { userId },
      relations: ['workExperiences', 'educations'],
    });

    if (!profile) return;

    const preferences = await this.userPreferencesRepository.findOne({
      where: { userId },
    });

    // Fetch recent interactions
    const recentInteractions = await this.jobInteractionRepository.find({
      where: { userId },
      relations: ['job'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    await this.queueService.queueUserEmbedding({
      userId,
      skills: profile.skills,
      languages: profile.languages,
      workExperiences: profile.workExperiences?.map((exp) => ({
        jobTitle: exp.jobTitle,
        description: exp.description,
        skills: exp.skills,
      })),
      educations: profile.educations?.map((edu) => ({
        institutionName: edu.institutionName,
        fieldOfStudy: edu.fieldOfStudy,
        degreeType: edu.degreeType,
        coursework: edu.coursework,
      })),
      preferences: preferences
        ? {
            skillsLike: preferences.skillsLike,
            preferredLocations: preferences.preferredLocations,
            preferredRoleTypes: preferences.preferredRoleTypes,
            industriesLike: preferences.industriesLike,
          }
        : undefined,
      recentInteractions: recentInteractions.map((inter) => ({
        jobTitle: inter.job?.title,
      })),
    });
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
  async getInterviewsByCandidateId(
    candidateId: string,
    options?: {
      status?: InterviewStatus;
      startDate?: Date;
      endDate?: Date;
      applicationId?: string;
      jobId?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: Interview[];
    total: number;
    page: number;
    limit: number;
  }> {
    const candidateProfile = await this.candidateProfileRepository.findOne({
      where: { userId: candidateId },
    });

    if (!candidateProfile) {
      throw new NotFoundException('Candidate profile not found');
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.interviewRepository
      .createQueryBuilder('interview')
      .innerJoin('interview.application', 'application')
      .where('application.candidateId = :candidateId', { candidateId })
      .leftJoinAndSelect('interview.application', 'app')
      .leftJoinAndSelect('app.job', 'jobDetails')
      .leftJoinAndSelect('jobDetails.organization', 'organization')
      .leftJoinAndSelect('interview.interviewer', 'interviewer')
      .orderBy('interview.scheduledDate', 'DESC');

    if (options?.status) {
      queryBuilder.andWhere('interview.status = :status', {
        status: options.status,
      });
    }

    if (options?.startDate) {
      queryBuilder.andWhere('interview.scheduledDate >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('interview.scheduledDate <= :endDate', {
        endDate: options.endDate,
      });
    }

    if (options?.applicationId) {
      queryBuilder.andWhere('application.id = :applicationId', {
        applicationId: options.applicationId,
      });
    }

    if (options?.jobId) {
      queryBuilder
        .innerJoin('app.job', 'job')
        .andWhere('job.id = :jobId', { jobId: options.jobId });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const data = await queryBuilder.skip(skip).take(limit).getMany();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Get all offers for a candidate with pagination and filters
   */
  async getOffersByCandidateId(
    candidateId: string,
    options?: {
      status?: OfferStatus;
      applicationId?: string;
      jobId?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: Offer[]; total: number; page: number; limit: number }> {
    // Verify candidate exists
    const candidateProfile = await this.candidateProfileRepository.findOne({
      where: { userId: candidateId },
    });

    if (!candidateProfile) {
      throw new NotFoundException('Candidate profile not found');
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    // Build query
    const queryBuilder = this.offerRepository
      .createQueryBuilder('offer')
      .innerJoin('offer.application', 'application')
      .where('application.candidateId = :candidateId', { candidateId })
      .leftJoinAndSelect('offer.application', 'app')
      .leftJoinAndSelect('app.job', 'jobDetails')
      .leftJoinAndSelect('jobDetails.organization', 'organization')
      .orderBy('offer.createdAt', 'DESC');

    // Apply filters
    if (options?.status) {
      queryBuilder.andWhere('offer.status = :status', {
        status: options.status,
      });
    }

    if (options?.applicationId) {
      queryBuilder.andWhere('application.id = :applicationId', {
        applicationId: options.applicationId,
      });
    }

    if (options?.jobId) {
      queryBuilder
        .innerJoin('app.job', 'job')
        .andWhere('job.id = :jobId', { jobId: options.jobId });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const data = await queryBuilder.skip(skip).take(limit).getMany();

    return {
      data,
      total,
      page,
      limit,
    };
  }
}
