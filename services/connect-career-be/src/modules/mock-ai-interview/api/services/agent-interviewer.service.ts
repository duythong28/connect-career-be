import { Injectable } from '@nestjs/common';
import { RetellAIProvider } from 'src/shared/infrastructure/external-services/ai/providers/retell-ai.provider';

@Injectable()
export class AgentInterviewerService {
  constructor(private readonly retellAIProvider: RetellAIProvider) {}

  async createDefaultInterviewer() {
    const defaultInterviewer = await this.retellAIProvider.createDefaultAgent();
    return defaultInterviewer;
  }
}
