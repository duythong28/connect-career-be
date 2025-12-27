import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationType,
} from '../../domain/entities/notification.entity';
import { IDomainEvent } from 'src/shared/domain';
import { ConfigService } from '@nestjs/config';

export interface NotificationTemplate {
  title: string;
  message: string;
  htmlContent: string | null;
}

@Injectable()
export class NotificationTemplateService {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  async getTemplate(
    type: NotificationType,
    channel: NotificationChannel,
    event: IDomainEvent,
  ): Promise<NotificationTemplate> {
    const eventData = event as any;
    const templateKey = `${type}_${channel}`;

    const templates: Record<string, (data: any) => NotificationTemplate> = {
        [`${NotificationType.APPLICATION_RECEIVED}_${NotificationChannel.EMAIL}`]:
        (data) => ({
          title: 'Application Submitted Successfully',
          message: `Your application for "${data.jobTitle || 'the position'}" has been submitted successfully.`,
          htmlContent: this.renderEmailTemplate('application-received', data),
        }),
        [`${NotificationType.APPLICATION_SHORTLISTED}_${NotificationChannel.PUSH}`]:
          (data) => ({
            title: '🎉 Application Shortlisted!',
            message: `Congratulations! Your application for "${data.jobTitle || 'the position'}" has been shortlisted.`,
            htmlContent: null,
        }),
        [`${NotificationType.APPLICATION_HIRED}_${NotificationChannel.EMAIL}`]: (
          data,
        ) => ({
          title: "🎊 Congratulations! You're Hired!",
          message: `Great news! You've been selected for "${data.jobTitle || 'the position'}". Welcome to the team!`,
          htmlContent: this.renderEmailTemplate('application-hired', data),
        }),
        [`${NotificationType.INTERVIEW_SCHEDULED}_${NotificationChannel.EMAIL}`]:
        (data) => ({
          title: 'Interview Scheduled',
          message: `Your interview for "${data.jobTitle || 'the position'}" has been scheduled for ${data.interviewDate || 'a future date'}.`,
          htmlContent: this.renderEmailTemplate('interview-scheduled', data),
        }),
        [`${NotificationType.JOB_RECOMMENDATION}_${NotificationChannel.EMAIL}`]: (event) => ({
          title: `New Job Recommendation: ${event.jobTitle}`,
          message: `We found a job that matches your profile: ${event.jobTitle}. Check it out!`,
          htmlContent: `
            <h2>New Job Recommendation</h2>
            <p>Hi there!</p>
            <p>We found a job that matches your profile:</p>
            <h3>${event.jobTitle}</h3>
            <p><a href='${this.configService.get<string>('FRONTEND_URL') || 'https://connect-career.vercel.app'}/jobs/${event.jobId}'>View Job Details</a></p>
          `,
        }),
        [`${NotificationType.JOB_RECOMMENDATION}_${NotificationChannel.WEBSOCKET}`]: (event) => ({
          title: `New Job Recommendation`,
          message: `We found a job that matches your profile: ${event.jobTitle}`,
          htmlContent: null,
        }),
        [`${NotificationType.JOB_RECOMMENDATION}_${NotificationChannel.PUSH}`]: (event) => ({
          title: `New Job Recommendation`,
          message: `${event.jobTitle} matches your profile`,
          htmlContent: null,
        }),
    };

    const templateFn =
    templates[templateKey] || this.getDefaultTemplate(type, channel);
    return templateFn(eventData);
  }

  private getDefaultTemplate(
    type: NotificationType,
    channel: NotificationChannel,
  ): (data: any) => NotificationTemplate {
    return (data: any) => ({
      title: 'Notification',
      message: data.message || 'You have a new notification',
      htmlContent:
        channel === NotificationChannel.EMAIL
          ? `<html><body><h1>Notification</h1><p>${data.message || 'You have a new notification'}</p></body></html>`
          : null,
    });
  }

  private renderEmailTemplate(templateName: string, data: any): string {
    // Use React Email or similar for HTML templates
    return `<html><body><h1>${data.title || 'Notification'}</h1><p>${data.message || 'You have a new notification'}</p></body></html>`;
  }
}
