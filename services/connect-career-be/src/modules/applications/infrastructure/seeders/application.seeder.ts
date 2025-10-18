import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import { User } from 'src/modules/identity/domain/entities';
import { CandidateProfile } from 'src/modules/profile/domain/entities/candidate-profile.entity';
import {
  CV,
  CVType,
  CVStatus,
  ParsingStatus,
} from 'src/modules/cv-maker/domain/entities/cv.entity';
import { PipelineStage } from 'src/modules/hiring-pipeline/domain/entities/pipeline-stage.entity';
import { HiringPipeline } from 'src/modules/hiring-pipeline/domain/entities/hiring-pipeline.entity';
import { Organization } from 'src/modules/profile/domain/entities/organization.entity';
import {
  Application,
  ApplicationSource,
  ApplicationStatus,
  PipelineStageHistory,
} from '../../domain/entities/application.entity';
import * as crypto from 'crypto';

@Injectable()
export class ApplicationSeeder {
  private readonly logger = new Logger(ApplicationSeeder.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CandidateProfile)
    private readonly candidateProfileRepository: Repository<CandidateProfile>,
    @InjectRepository(CV)
    private readonly cvRepository: Repository<CV>,
    @InjectRepository(PipelineStage)
    private readonly pipelineStageRepository: Repository<PipelineStage>,
    @InjectRepository(HiringPipeline)
    private readonly hiringPipelineRepository: Repository<HiringPipeline>,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('🚀 Starting application seeding...');

    try {
      // Use your existing pipeline
      const pipeline = await this.getExistingPipeline();
      if (!pipeline) {
        this.logger.error(
          'No existing pipeline found. Please ensure your pipeline is seeded first.',
        );
        return;
      }

      // Get jobs from your existing pipeline
      const jobs = await this.jobRepository.find({
        where: { hiringPipelineId: pipeline.id },
        relations: ['hiringPipeline', 'hiringPipeline.stages'],
      });

      if (jobs.length === 0) {
        this.logger.warn('No jobs found for the existing pipeline.');
        return;
      }

      // Create or get candidates
      const candidates = await this.ensureCandidates();
      const cvs = await this.ensureCVsForCandidates(candidates);

      // Create applications with your pipeline stages
      await this.createApplicationsWithExistingPipeline(
        jobs,
        candidates,
        cvs,
        pipeline,
      );

      this.logger.log('✅ Application seeding completed successfully');
    } catch (error) {
      this.logger.error('Failed to seed applications', error);
      throw error;
    }
  }

  private async getExistingPipeline(): Promise<HiringPipeline | null> {
    // Get your specific pipeline by ID
    const pipelineId = '1532c0bc-1815-4207-a12b-d47b5ed91ec6';
    return await this.hiringPipelineRepository.findOne({
      where: { id: pipelineId },
      relations: ['stages', 'transitions', 'jobs'],
    });
  }

  private async ensureCandidates(): Promise<User[]> {
    // Get existing candidates or create new ones
    let candidates = await this.userRepository.find({
      take: 10,
    });

    if (candidates.length === 0) {
      candidates = await this.createSampleCandidates();
    }

    return candidates;
  }

  private async createSampleCandidates(): Promise<User[]> {
    const passwordHash = crypto
      .createHash('sha256')
      .update('User@123456')
      .digest('hex');
    const candidates: User[] = [];

    const candidateData = [
      {
        email: 'data.engineer1@example.com',
        firstName: 'Alex',
        lastName: 'Chen',
        username: 'alex.chen',
        passwordHash: passwordHash,
        role: 'user',
      },
      {
        email: 'data.scientist2@example.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        username: 'sarah.johnson',
        passwordHash: passwordHash,
        role: 'user',
      },
      {
        email: 'ml.engineer3@example.com',
        firstName: 'David',
        lastName: 'Kim',
        username: 'david.kim',
        passwordHash: passwordHash,
        role: 'user',
      },
      {
        email: 'analytics.expert4@example.com',
        firstName: 'Maria',
        lastName: 'Garcia',
        username: 'maria.garcia',
        passwordHash: passwordHash,
        role: 'user',
      },
      {
        email: 'bigdata.specialist5@example.com',
        firstName: 'James',
        lastName: 'Wilson',
        username: 'james.wilson',
        passwordHash: passwordHash,
        role: 'user',
      },
    ];

    for (const data of candidateData) {
      const candidate = this.userRepository.create({
        ...data,
        isActive: true,
        emailVerified: true,
      });
      candidates.push(await this.userRepository.save(candidate));
    }

    return candidates;
  }

  private async ensureCVsForCandidates(candidates: User[]): Promise<CV[]> {
    const cvs: CV[] = [];

    for (const candidate of candidates) {
      let cv = await this.cvRepository.findOne({
        where: { userId: candidate.id },
      });

      if (!cv) {
        cv = this.cvRepository.create({
          userId: candidate.id,
          title: `${candidate?.firstName} ${candidate?.lastName} - Data Engineer CV`,
          type: CVType.PDF,
          tags: ['data-engineering', 'seeded', 'professional'],
          isPublic: false,
          status: CVStatus.PUBLISHED,
          parsingStatus: ParsingStatus.NOT_REQUIRED,
          description: `Professional CV for ${candidate?.firstName} ${candidate?.lastName} - Data Engineering Specialist`,
          content: {
            personalInfo: {
              name: `${candidate?.firstName} ${candidate?.lastName}`,
              email: candidate.email,
              phone: '+84901234567',
              address: 'Ho Chi Minh City, Vietnam',
              linkedin: `https://linkedin.com/in/${candidate?.firstName?.toLowerCase()}-${candidate?.lastName?.toLowerCase()}`,
              github: `https://github.com/${candidate?.firstName?.toLowerCase()}${candidate?.lastName?.toLowerCase()}`,
            },
            summary: `Experienced Data Engineer with ${Math.floor(Math.random() * 8) + 3} years of expertise in building scalable data pipelines, cloud architectures, and big data solutions. Strong background in Python, SQL, Apache Spark, and cloud platforms.`,
            workExperience: [
              {
                id: 'exp-1',
                company: 'TechCorp Vietnam',
                position: 'Senior Data Engineer',
                startDate: '2021-01-01',
                endDate: '2024-12-31',
                current: false,
                description:
                  'Led development of real-time data processing pipelines using Apache Kafka and Spark. Implemented data warehousing solutions on AWS and GCP.',
                technologies: [
                  'Python',
                  'Apache Spark',
                  'Apache Kafka',
                  'AWS',
                  'GCP',
                  'SQL',
                  'Docker',
                  'Kubernetes',
                ],
                achievements: [
                  'Reduced data processing time by 60%',
                  'Led team of 4 data engineers',
                  'Implemented CI/CD for data pipelines',
                ],
              },
              {
                id: 'exp-2',
                company: 'DataFlow Solutions',
                position: 'Data Engineer',
                startDate: '2019-06-01',
                endDate: '2020-12-31',
                current: false,
                description:
                  'Built ETL pipelines and data integration solutions for enterprise clients.',
                technologies: [
                  'Python',
                  'PostgreSQL',
                  'MongoDB',
                  'Apache Airflow',
                  'Docker',
                ],
                achievements: [
                  'Built 15+ ETL pipelines',
                  'Improved data quality by 40%',
                ],
              },
            ],
            education: [
              {
                id: 'edu-1',
                institution: 'Ho Chi Minh City University of Technology',
                degree: 'Bachelor of Science',
                fieldOfStudy: 'Computer Science',
                startDate: '2015-09-01',
                endDate: '2019-06-01',
                gpa: 3.6,
                honors: ["Dean's List", 'Data Science Excellence Award'],
              },
            ],
            skills: {
              technical: [
                'Python',
                'SQL',
                'Apache Spark',
                'Apache Kafka',
                'Apache Airflow',
                'AWS',
                'GCP',
                'Docker',
                'Kubernetes',
                'PostgreSQL',
                'MongoDB',
                'Redis',
              ],
              soft: [
                'Leadership',
                'Problem Solving',
                'Communication',
                'Teamwork',
                'Mentoring',
              ],
              languages: [
                { language: 'English', proficiency: 'advanced' },
                { language: 'Vietnamese', proficiency: 'native' },
              ],
            },
            certifications: [
              {
                id: 'cert-1',
                name: 'AWS Certified Data Analytics - Specialty',
                issuer: 'Amazon Web Services',
                issueDate: '2023-03-15',
                credentialId: 'AWS-DAS-123456',
              },
              {
                id: 'cert-2',
                name: 'Google Cloud Professional Data Engineer',
                issuer: 'Google Cloud',
                issueDate: '2022-08-20',
                credentialId: 'GCP-PDE-789012',
              },
            ],
            projects: [
              {
                id: 'proj-1',
                name: 'Real-time Analytics Platform',
                description:
                  'Built a real-time data processing platform using Apache Kafka, Spark, and Kubernetes for processing 1M+ events per day',
                startDate: '2023-01-01',
                endDate: '2023-06-01',
                technologies: [
                  'Apache Kafka',
                  'Apache Spark',
                  'Kubernetes',
                  'Python',
                  'Redis',
                ],
                github: `https://github.com/${candidate?.firstName?.toLowerCase()}/realtime-analytics`,
              },
            ],
          },
          extractedText: `Professional CV for ${candidate.firstName} ${candidate.lastName}. Experienced data engineer with expertise in cloud computing, big data technologies, and machine learning.`,
          metadata: {
            source: 'seeder',
            version: '1.0',
            createdBy: 'application-seeder',
            specialization: 'data-engineering',
          },
        });
        cvs.push(await this.cvRepository.save(cv));
      } else {
        cvs.push(cv);
      }
    }

    return cvs;
  }

  private async createApplicationsWithExistingPipeline(
    jobs: Job[],
    candidates: User[],
    cvs: CV[],
    pipeline: HiringPipeline,
  ): Promise<void> {
    const applications: Application[] = [];

    // Get the first stage (applied) from your pipeline
    const appliedStage = pipeline.stages.find(
      (stage) => stage.key === 'applied',
    );
    if (!appliedStage) {
      this.logger.error('Applied stage not found in pipeline');
      return;
    }

    for (let i = 0; i < Math.min(jobs.length, candidates.length); i++) {
      const job = jobs[i];
      const candidate = candidates[i];
      const cv = cvs[i];

      // Create application starting at 'applied' stage
      const application = this.applicationRepository.create({
        // Required fields
        jobId: job.id,
        candidateId: candidate.id,
        status: ApplicationStatus.NEW,
        appliedDate: new Date(),
        matchingScore: Math.random() * 100,
        isAutoScored: true,
        totalInterviews: 0,
        completedInterviews: 0,
        daysSinceApplied: 0,
        daysInCurrentStatus: 0,
        passedScreening: false,
        emailsSent: 0,
        emailsReceived: 0,
        awaitingCandidateResponse: false,
        source: ApplicationSource.DIRECT,
        priority: 0,
        isFlagged: false,
        isShortlisted: false,
        candidateNotified: false,
        profileViews: 0,
        backgroundCheckRequired: false,
        backgroundCheckCompleted: false,

        // Optional fields with values
        cvId: cv.id,
        coverLetter: this.generateCoverLetter(candidate, job),
        lastScoredAt: new Date(),
        currentStageKey: appliedStage.key,
        currentStageName: appliedStage.name,
        pipelineStageHistory: [
          {
            stageId: appliedStage.id,
            stageKey: appliedStage.key,
            stageName: appliedStage.name,
            changedAt: new Date(),
            changedBy: candidate.id,
            reason: 'Initial application stage',
          },
        ],
        statusHistory: [
          {
            status: ApplicationStatus.NEW,
            changedAt: new Date(),
            changedBy: candidate.id,
            reason: 'Application submitted',
            stageKey: appliedStage.key,
            stageName: appliedStage.name,
          },
        ],
        candidateSnapshot: {
          name: `${candidate.firstName} ${candidate.lastName}`,
          email: candidate.email,
          phone: '+84901234567',
          currentTitle: 'Senior Data Engineer',
          currentCompany: 'TechCorp Vietnam',
          yearsOfExperience: Math.floor(Math.random() * 8) + 3,
          expectedSalary: Math.floor(Math.random() * 20000000) + 50000000, // 50-70M VND
          noticePeriod: '2 weeks',
          location: 'Ho Chi Minh City, Vietnam',
        },
        parsedResumeData: {
          skills: [
            'Python',
            'SQL',
            'Apache Spark',
            'Apache Kafka',
            'AWS',
            'GCP',
            'Docker',
            'Kubernetes',
          ],
          experience: [
            'Senior Data Engineer',
            'Data Engineer',
            'Big Data Developer',
          ],
          education: ['Bachelor of Science in Computer Science'],
          certifications: [
            'AWS Certified Data Analytics',
            'Google Cloud Professional Data Engineer',
          ],
          languages: ['English', 'Vietnamese'],
        },
        tags: ['seeded', 'data-engineering', 'test-application'],
        customFields: {
          source: 'seeder',
          createdBy: 'application-seeder',
          version: '1.0',
          specialization: 'data-engineering',
        },
      });

      applications.push(application);
    }

    // Save applications in batches
    const batchSize = 5;
    for (let i = 0; i < applications.length; i += batchSize) {
      const batch = applications.slice(i, i + batchSize);
      await this.applicationRepository.save(batch);
      this.logger.log(
        `Created ${batch.length} applications (batch ${Math.floor(i / batchSize) + 1})`,
      );
    }

    // Simulate some applications moving through your pipeline stages
    await this.simulatePipelineProgress(applications, pipeline);
  }

  private generateCoverLetter(candidate: User, job: Job): string {
    return `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at Cloud Thinker. With my extensive experience in data engineering, cloud computing, and big data technologies, I am confident that I would be a valuable addition to your team.

My background includes:
- ${Math.floor(Math.random() * 8) + 3} years of experience in data engineering and cloud platforms
- Expertise in Python, SQL, Apache Spark, Apache Kafka, and cloud technologies (AWS, GCP)
- Proven track record of building scalable data pipelines and real-time processing systems
- Experience with containerization (Docker, Kubernetes) and CI/CD practices

I am particularly excited about the opportunity to work with Cloud Thinker's innovative approach to data solutions and would welcome the chance to discuss how my skills and experience can contribute to your team's success.

Thank you for considering my application.

Best regards,
${candidate.firstName} ${candidate.lastName}`;
  }

  private async simulatePipelineProgress(
    applications: Application[],
    pipeline: HiringPipeline,
  ): Promise<void> {
    // Move some applications through your specific pipeline stages
    const stageKeys = [
      'applied',
      'cv_screen',
      'technical_phone',
      'take_home',
      'onsite_presentation',
      'offer',
    ];

    for (let i = 0; i < Math.min(3, applications.length); i++) {
      const application = applications[i];

      // Move through 2-3 stages
      const stagesToMove = Math.min(3, stageKeys.length - 1);

      for (let j = 1; j <= stagesToMove; j++) {
        const newStageKey = stageKeys[j];
        const newStage = pipeline.stages.find(
          (stage) => stage.key === newStageKey,
        );
        const previousStage = pipeline.stages.find(
          (stage) => stage.key === stageKeys[j - 1],
        );

        if (!newStage || !previousStage) continue;

        // Update application stage
        application.currentStageKey = newStage.key;
        application.currentStageName = newStage.name;

        // Add to pipeline stage history
        const stageHistory: PipelineStageHistory = {
          stageId: newStage.id,
          stageKey: newStage.key,
          stageName: newStage.name,
          changedAt: new Date(),
          changedBy: 'system',
          reason: `Moved to ${newStage.name} stage`,
          previousStageKey: previousStage.key,
          transitionAction: `Move to ${newStage.name}`,
        };

        application.pipelineStageHistory = [
          ...(application.pipelineStageHistory || []),
          stageHistory,
        ];

        // Update status based on stage
        const newStatus = this.mapStageToStatus(newStage.key);
        application.status = newStatus;

        // Add to status history
        application.statusHistory = [
          ...(application.statusHistory || []),
          {
            status: newStatus,
            changedAt: new Date(),
            changedBy: 'system',
            reason: `Stage changed to ${newStage.name}`,
            stageKey: newStage.key,
            stageName: newStage.name,
          },
        ];

        application.lastStatusChange = new Date();
        application.updateCalculatedFields();
      }

      await this.applicationRepository.save(application);
      this.logger.log(
        `Moved application ${application.id} through ${stagesToMove} stages`,
      );
    }
  }

  private mapStageToStatus(stageKey: string): ApplicationStatus {
    const stageStatusMap: Record<string, ApplicationStatus> = {
      applied: ApplicationStatus.NEW,
      cv_screen: ApplicationStatus.UNDER_REVIEW,
      technical_phone: ApplicationStatus.SCREENING,
      take_home: ApplicationStatus.INTERVIEW_SCHEDULED,
      onsite_presentation: ApplicationStatus.INTERVIEW_IN_PROGRESS,
      offer: ApplicationStatus.OFFER_PENDING,
      hired: ApplicationStatus.HIRED,
      rejected: ApplicationStatus.REJECTED,
    };

    return stageStatusMap[stageKey] || ApplicationStatus.NEW;
  }

  async clearApplications(): Promise<void> {
    this.logger.log('🧹 Clearing existing applications...');
    await this.applicationRepository.delete({});
    this.logger.log('✅ Applications cleared');
  }
}
