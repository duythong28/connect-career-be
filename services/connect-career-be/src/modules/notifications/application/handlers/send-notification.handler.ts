import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SendNotificationCommand } from '../commands/send-notification.command';
import { NotificationResponseDTO } from '../dtos/notification-response.dto';
import * as notificationRepository from '../../domain/repositories/notification.repository';
import { ProviderFactory } from '../../infrastructure/providers/common/provider.factory';
import { NotificationStatus } from '../../domain/entities/notification.entity';

@Injectable()
@CommandHandler(SendNotificationCommand)
export class SendNotificationHandler
  implements ICommandHandler<SendNotificationCommand>
{
  constructor(
    @Inject(notificationRepository.NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: notificationRepository.INotificationRepository,
    private readonly providerFactory: ProviderFactory,
  ) {}

  async execute(
    command: SendNotificationCommand,
  ): Promise<NotificationResponseDTO> {
    const { recipient, message, channel, title } = command;

    const provider = this.providerFactory.createProvider(channel);
    await provider.send(recipient, title, message);

    const notification = await this.notificationRepository.create({
      recipient,
      title,
      message,
      channel,
      status: NotificationStatus.SENT,
    });

    return new NotificationResponseDTO(notification);
  }
}