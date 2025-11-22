import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InterviewResponse } from '../../domain/entities/mock_interview_responses.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ResponseService {
  private readonly logger = new Logger(ResponseService.name);

  constructor(
    @InjectRepository(InterviewResponse)
    private readonly responseRepository: Repository<InterviewResponse>,
  ) {}

  async createResponse(
    sessionId: string,
    callId: string,
    email: string,
    name: string,
  ): Promise<InterviewResponse> {
    try {
      const response = this.responseRepository.create({
        sessionId,
        callId,
        email,
        name,
        isEnded: false,
        isAnalysed: false,
      });
      return await this.responseRepository.save(response);
    } catch (error) {
      this.logger.error('Error creating response', { error });
      throw new InternalServerErrorException('Internal server error');
    }
  }

  async getResponseByCallId(callId: string): Promise<InterviewResponse> {
    const response = await this.responseRepository.findOne({
      where: { callId },
      relations: ['session'],
    });

    if (!response) {
      throw new NotFoundException(`Response with callId ${callId} not found`);
    }

    return response;
  }

  async getAllEmailsBySessionId(sessionId: string): Promise<string[]> {
    const responses = await this.responseRepository.find({
      where: { sessionId },
      select: ['email'],
    });

    return responses
      .map((r) => r.email)
      .filter(
        (email): email is string => email !== null && email !== undefined,
      );
  }

  async getAllResponsesBySessionId(
    sessionId: string,
  ): Promise<InterviewResponse[]> {
    return await this.responseRepository.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });
  }
  async updateResponse(
    callId: string,
    updates: Partial<InterviewResponse>,
  ): Promise<InterviewResponse> {
    const response = await this.getResponseByCallId(callId);

    Object.assign(response, updates);
    return await this.responseRepository.save(response);
  }

  async saveResponse(
    callId: string,
    data: {
      transcript?: string;
      analytics?: any;
      isAnalysed?: boolean;
      isEnded?: boolean;
      duration?: number;
    },
  ): Promise<InterviewResponse> {
    const response = await this.getResponseByCallId(callId);
    Object.assign(response, data);
    return await this.responseRepository.save(response);
  }
}
