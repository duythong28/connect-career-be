import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Application,
  CommunicationLog,
} from '../../domain/entities/application.entity';
import { LogCommunicationDto } from '../dtos/communication.dto';

@Injectable()
export class CommunicationService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {}

  async logCommunication(
    applicationId: string,
    logDto: LogCommunicationDto,
  ): Promise<Application | null> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const communicationLog = {
      id: `comm_${Date.now()}`,
      type: logDto.type,
      direction: logDto.direction,
      subject: logDto.subject,
      content: logDto.content,
      timestamp: new Date(),
      loggedBy: logDto.loggedBy,
      status: 'sent',
    };

    const communicationLogs = application.communicationLogs || [];
    communicationLogs.push(communicationLog as CommunicationLog);

    await this.applicationRepository.update(applicationId, {
      communicationLogs,
      lastContactDate: new Date(),
    });

    return this.applicationRepository.findOne({ where: { id: applicationId } });
  }

  async getCommunicationLog(applicationId: string): Promise<any[]> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application.communicationLogs || [];
  }
}
