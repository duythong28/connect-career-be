import { Injectable, Logger } from '@nestjs/common';
import { RetellAIProvider } from 'src/shared/infrastructure/external-services/ai/providers/retell-ai.provider';
import { AgentInterviewer } from '../../domain/entities/agent_interviewer.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_INTERVIEWERS } from 'src/shared/infrastructure/external-services/ai/prompts/retell_model.prompt';
import { User } from 'src/modules/identity/domain/entities';

@Injectable()
export class AgentInterviewerService {
  private readonly logger = new Logger(AgentInterviewerService.name);
  constructor(
    private readonly retellAIProvider: RetellAIProvider,
    @InjectRepository(AgentInterviewer)
    private readonly agentInterviewerRepository: Repository<AgentInterviewer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createDefaultInterviewer() {
    const { henryInterviewer, marcusInterviewer, defaultInterviewerModel } = await this.retellAIProvider.createDefaultAgent();
    try {
      // Check if Henry already exists
      let henry = await this.agentInterviewerRepository.findOne({
        where: { retellAgentId: henryInterviewer.agent_id },
      });

      const systemEmail = 'system@connect-career.com';
      const systemUser = await this.userRepository.findOne({
        where: { email: systemEmail },
      });
  
      if (!henry) {
        // Create Henry interviewer in database
        henry = this.agentInterviewerRepository.create({
          userId: systemUser!.id,
          name: DEFAULT_INTERVIEWERS.HENRY.name,
          rapport: DEFAULT_INTERVIEWERS.HENRY.rapport,
          exploration: DEFAULT_INTERVIEWERS.HENRY.exploration,
          empathy: DEFAULT_INTERVIEWERS.HENRY.empathy,
          speed: DEFAULT_INTERVIEWERS.HENRY.speed,
          image: DEFAULT_INTERVIEWERS.HENRY.image,
          description: DEFAULT_INTERVIEWERS.HENRY.description,
          audio: DEFAULT_INTERVIEWERS.HENRY.audio,
          retellAgentId: henryInterviewer.agent_id,
        });
        henry = await this.agentInterviewerRepository.save(henry);
        this.logger.log(`Henry interviewer saved to database: ${henry.id}`);
      } else {
        this.logger.log(`Henry interviewer already exists: ${henry.id}`);
      }

      // Check if Marcus already exists
      let marcus = await this.agentInterviewerRepository.findOne({
        where: { retellAgentId: marcusInterviewer.agent_id },
      });

      if (!marcus) {
        // Create Marcus interviewer in database
        marcus = this.agentInterviewerRepository.create({
          userId: systemUser!.id,
          name: DEFAULT_INTERVIEWERS.MARCUS.name,
          rapport: DEFAULT_INTERVIEWERS.MARCUS.rapport,
          exploration: DEFAULT_INTERVIEWERS.MARCUS.exploration,
          empathy: DEFAULT_INTERVIEWERS.MARCUS.empathy,
          speed: DEFAULT_INTERVIEWERS.MARCUS.speed,
          image: DEFAULT_INTERVIEWERS.MARCUS.image,
          description: DEFAULT_INTERVIEWERS.MARCUS.description,
          audio: DEFAULT_INTERVIEWERS.MARCUS.audio,
          retellAgentId: marcusInterviewer.agent_id,
        });
        marcus = await this.agentInterviewerRepository.save(marcus);
        this.logger.log(`Marcus interviewer saved to database: ${marcus.id}`);
      } else {
        this.logger.log(`Marcus interviewer already exists: ${marcus.id}`);
      }

      return {
        henry: henry,
        marcus: marcus,
        henryInterviewer,
        marcusInterviewer,
        defaultInterviewerModel,
      };
    } catch (error) {
      this.logger.error('Error saving default interviewers to database:', error);
      throw error;
    }
  }

  async getAllInterviewers(): Promise<AgentInterviewer[]> {
    return this.agentInterviewerRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getInterviewerById(id: string): Promise<AgentInterviewer | null> {
    return this.agentInterviewerRepository.findOne({
      where: { id },
    });
  }
}
