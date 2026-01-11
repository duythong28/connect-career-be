import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationType,
} from '../../domain/entities/notification.entity';
import { IDomainEvent } from 'src/shared/domain';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';

// Import all templates
import {
  ApplicationReceivedEmail,
  ApplicationStatusChangedEmail,
  ApplicationShortlistedEmail,
  ApplicationRejectedEmail,
  ApplicationHiredEmail,
  ApplicationDeadlineReminderEmail,
} from '../../infrastructure/providers/common/template/application-templates';
import {
  InterviewScheduledEmail,
  InterviewReminderEmail,
  InterviewCancelledEmail,
  InterviewRescheduledEmail,
} from '../../infrastructure/providers/common/template/interview-templates';
import {
  OfferSentEmail,
  OfferAcceptedEmail,
  OfferRejectedEmail,
} from '../../infrastructure/providers/common/template/offer-templates';
import {
  NewMessageEmail,
  MentionEmail,
} from '../../infrastructure/providers/common/template/communication-templates';
import { JobDeadlineApproachingEmail } from '../../infrastructure/providers/common/template/job-templates';
import {
  ProfileViewedEmail,
  CvFeedbackEmail,
} from '../../infrastructure/providers/common/template/profile-templates';
import {
  ReportCreatedEmail,
  ReportStatusChangedEmail,
  ReportAssignedEmail,
  ReportResolvedEmail,
  ReportDismissedEmail,
} from '../../infrastructure/providers/common/template/report-templates';
import { EmailVerifiedEmail } from '../../infrastructure/providers/common/template/system-templates';
import JobAlertEmail from '../../infrastructure/providers/common/template/job-alert.template';

export interface NotificationTemplate {
  title: string;
  message: string;
  htmlContent: string | null;
}

@Injectable()
export class NotificationTemplateService {
  constructor(private readonly configService: ConfigService) {}

  async getTemplate(
    type: NotificationType,
    channel: NotificationChannel,
    event: IDomainEvent,
  ): Promise<NotificationTemplate> {
    const eventData = event as any;
    const templateKey = `${type}_${channel}`;
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://connect-career.vercel.app';

    const templates: Record<
      string,
      (data: any) => Promise<NotificationTemplate>
    > = {
      // Application Related
      [`${NotificationType.APPLICATION_RECEIVED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            ApplicationReceivedEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              jobTitle: data.jobTitle || 'the position',
              companyName: data.companyName || data.company || 'the company',
              applicationUrl:
                data.applicationUrl ||
                `${frontendUrl}/applications/${data.applicationId || ''}`,
            }),
          );
          return {
            title: 'Application Submitted Successfully',
            message: `Your application for "${data.jobTitle || 'the position'}" has been submitted successfully.`,
            htmlContent: html,
          };
        },

      [`${NotificationType.APPLICATION_STATUS_CHANGED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            ApplicationStatusChangedEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              jobTitle: data.jobTitle || 'the position',
              companyName: data.companyName || data.company || 'the company',
              status: data.status || 'updated',
              applicationUrl:
                data.applicationUrl ||
                `${frontendUrl}/applications/${data.applicationId || ''}`,
            }),
          );
          return {
            title: 'Application Status Updated',
            message: `Your application status for "${data.jobTitle || 'the position'}" has been updated to ${data.status || 'updated'}.`,
            htmlContent: html,
          };
        },

      [`${NotificationType.APPLICATION_SHORTLISTED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            ApplicationShortlistedEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              jobTitle: data.jobTitle || 'the position',
              companyName: data.companyName || data.company || 'the company',
              applicationUrl:
                data.applicationUrl ||
                `${frontendUrl}/applications/${data.applicationId || ''}`,
            }),
          );
          return {
            title: '🎉 Application Shortlisted!',
            message: `Congratulations! Your application for "${data.jobTitle || 'the position'}" has been shortlisted.`,
            htmlContent: html,
          };
        },

      [`${NotificationType.APPLICATION_REJECTED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            ApplicationRejectedEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              jobTitle: data.jobTitle || 'the position',
              companyName: data.companyName || data.company || 'the company',
              feedback: data.feedback,
              browseJobsUrl: `${frontendUrl}/jobs`,
            }),
          );
          return {
            title: 'Application Update',
            message: `Update on your application for "${data.jobTitle || 'the position'}".`,
            htmlContent: html,
          };
        },

      [`${NotificationType.APPLICATION_HIRED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            ApplicationHiredEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              jobTitle: data.jobTitle || 'the position',
              companyName: data.companyName || data.company || 'the company',
              offerDetails: data.offerDetails,
              nextStepsUrl:
                data.nextStepsUrl ||
                `${frontendUrl}/applications/${data.applicationId || ''}`,
            }),
          );
          return {
            title: "🎊 Congratulations! You're Hired!",
            message: `Great news! You've been selected for "${data.jobTitle || 'the position'}". Welcome to the team!`,
            htmlContent: html,
          };
        },

      [`${NotificationType.APPLICATION_DEADLINE_REMINDER}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            ApplicationDeadlineReminderEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              jobTitle: data.jobTitle || 'the position',
              companyName: data.companyName || data.company || 'the company',
              deadline: data.deadline || 'soon',
              applicationUrl:
                data.applicationUrl ||
                `${frontendUrl}/applications/${data.applicationId || ''}`,
            }),
          );
          return {
            title: '⏰ Application Deadline Reminder',
            message: `Reminder: Application deadline for "${data.jobTitle || 'the position'}" is approaching.`,
            htmlContent: html,
          };
        },

      // Interview Related
      [`${NotificationType.INTERVIEW_SCHEDULED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            InterviewScheduledEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              jobTitle: data.jobTitle || 'the position',
              companyName: data.companyName || data.company || 'the company',
              interviewDate: data.interviewDate || data.date || 'TBD',
              interviewTime: data.interviewTime || data.time || 'TBD',
              location: data.location,
              meetingLink: data.meetingLink || data.meetingUrl,
              interviewType: data.interviewType || 'Interview',
              interviewUrl:
                data.interviewUrl ||
                `${frontendUrl}/interviews/${data.interviewId || ''}`,
            }),
          );
          return {
            title: 'Interview Scheduled',
            message: `Your interview for "${data.jobTitle || 'the position'}" has been scheduled for ${data.interviewDate || 'a future date'}.`,
            htmlContent: html,
          };
        },

      [`${NotificationType.INTERVIEW_REMINDER}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            InterviewReminderEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              jobTitle: data.jobTitle || 'the position',
              companyName: data.companyName || data.company || 'the company',
              interviewDate: data.interviewDate || data.date || 'TBD',
              interviewTime: data.interviewTime || data.time || 'TBD',
              meetingLink: data.meetingLink || data.meetingUrl,
              interviewUrl:
                data.interviewUrl ||
                `${frontendUrl}/interviews/${data.interviewId || ''}`,
            }),
          );
          return {
            title: '⏰ Interview Reminder',
            message: `Reminder: Interview for "${data.jobTitle || 'the position'}" is scheduled for ${data.interviewDate || 'soon'}.`,
            htmlContent: html,
          };
        },

      [`${NotificationType.INTERVIEW_CANCELLED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            InterviewCancelledEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              jobTitle: data.jobTitle || 'the position',
              companyName: data.companyName || data.company || 'the company',
              reason: data.reason,
              rescheduleUrl:
                data.rescheduleUrl ||
                `${frontendUrl}/interviews/${data.interviewId || ''}/reschedule`,
            }),
          );
          return {
            title: 'Interview Cancelled',
            message: `Your interview for "${data.jobTitle || 'the position'}" has been cancelled.`,
            htmlContent: html,
          };
        },

      [`${NotificationType.INTERVIEW_RESCHEDULED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            InterviewRescheduledEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              jobTitle: data.jobTitle || 'the position',
              companyName: data.companyName || data.company || 'the company',
              oldDate: data.oldDate || 'previous date',
              oldTime: data.oldTime || 'previous time',
              newDate: data.newDate || data.interviewDate || 'new date',
              newTime: data.newTime || data.interviewTime || 'new time',
              meetingLink: data.meetingLink || data.meetingUrl,
              interviewUrl:
                data.interviewUrl ||
                `${frontendUrl}/interviews/${data.interviewId || ''}`,
            }),
          );
          return {
            title: 'Interview Rescheduled',
            message: `Your interview for "${data.jobTitle || 'the position'}" has been rescheduled.`,
            htmlContent: html,
          };
        },

      // Offer Related
      [`${NotificationType.OFFER_SENT}_${NotificationChannel.EMAIL}`]: async (
        data,
      ) => {
        const html = await render(
          OfferSentEmail({
            userFirstname: data.userFirstname || data.firstName || 'there',
            jobTitle: data.jobTitle || 'the position',
            companyName: data.companyName || data.company || 'the company',
            offerDetails: data.offerDetails,
            offerUrl:
              data.offerUrl || `${frontendUrl}/offers/${data.offerId || ''}`,
            deadline: data.deadline,
          }),
        );
        return {
          title: '🎉 Job Offer Received!',
          message: `You've received a job offer for "${data.jobTitle || 'the position'}".`,
          htmlContent: html,
        };
      },

      [`${NotificationType.OFFER_ACCEPTED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            OfferAcceptedEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              jobTitle: data.jobTitle || 'the position',
              companyName: data.companyName || data.company || 'the company',
              startDate: data.startDate,
              nextStepsUrl:
                data.nextStepsUrl ||
                `${frontendUrl}/offers/${data.offerId || ''}`,
            }),
          );
          return {
            title: '🎊 Offer Accepted!',
            message: `Congratulations! You've accepted the offer for "${data.jobTitle || 'the position'}".`,
            htmlContent: html,
          };
        },

      [`${NotificationType.OFFER_REJECTED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            OfferRejectedEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              jobTitle: data.jobTitle || 'the position',
              companyName: data.companyName || data.company || 'the company',
              browseJobsUrl: `${frontendUrl}/jobs`,
            }),
          );
          return {
            title: 'Offer Update',
            message: `Update on your offer for "${data.jobTitle || 'the position'}".`,
            htmlContent: html,
          };
        },

      // Communication
      [`${NotificationType.NEW_MESSAGE}_${NotificationChannel.EMAIL}`]: async (
        data,
      ) => {
        const html = await render(
          NewMessageEmail({
            userFirstname: data.userFirstname || data.firstName || 'there',
            senderName: data.senderName || data.sender || 'someone',
            messagePreview: data.messagePreview || data.message,
            conversationUrl:
              data.conversationUrl ||
              `${frontendUrl}/messages/${data.conversationId || ''}`,
          }),
        );
        return {
          title: 'New Message',
          message: `You have a new message from ${data.senderName || 'someone'}.`,
          htmlContent: html,
        };
      },

      [`${NotificationType.MENTION}_${NotificationChannel.EMAIL}`]: async (
        data,
      ) => {
        const html = await render(
          MentionEmail({
            userFirstname: data.userFirstname || data.firstName || 'there',
            mentionedBy: data.mentionedBy || data.sender || 'someone',
            context: data.context,
            mentionUrl:
              data.mentionUrl ||
              `${frontendUrl}/messages/${data.conversationId || ''}`,
          }),
        );
        return {
          title: "You've Been Mentioned",
          message: `${data.mentionedBy || 'Someone'} mentioned you in a conversation.`,
          htmlContent: html,
        };
      },

      // Job Related
      [`${NotificationType.JOB_RECOMMENDATION}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          // Handle emailHtml - it could be a string, Promise, or function
          console.log('emailHtml length:', data.emailHtml.toString().length);
          const emailHtml = data.emailHtml;

          if (emailHtml) {
            return {
              title: `${data.jobs?.length || 1} new job${(data.jobs?.length || 1) !== 1 ? 's' : ''} matching your profile`,
              message: `We found ${data.jobs?.length || 1} new job${(data.jobs?.length || 1) !== 1 ? 's' : ''} that match your profile.`,
              htmlContent: emailHtml,
            };
          }

          // Fallback to JobAlertEmail template
          const html = await render(
            JobAlertEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              jobTitle: data.jobTitle,
              locationName: data.locationName || 'your area',
              jobs: data.jobs || [],
              viewAllJobsUrl: `${frontendUrl}/jobs`,
            }),
          );
          return {
            title: `${data.jobs?.length || 1} new job${(data.jobs?.length || 1) !== 1 ? 's' : ''} matching your profile`,
            message: `We found ${data.jobs?.length || 1} new job${(data.jobs?.length || 1) !== 1 ? 's' : ''} that match your profile.`,
            htmlContent: html,
          };
        },

      [`${NotificationType.JOB_DEADLINE_APPROACHING}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            JobDeadlineApproachingEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              jobTitle: data.jobTitle || 'the position',
              companyName: data.companyName || data.company || 'the company',
              deadline: data.deadline || 'soon',
              jobUrl: data.jobUrl || `${frontendUrl}/jobs/${data.jobId || ''}`,
            }),
          );
          return {
            title: '⏰ Application Deadline Approaching',
            message: `The application deadline for "${data.jobTitle || 'the position'}" is approaching.`,
            htmlContent: html,
          };
        },

      // Profile Related
      [`${NotificationType.PROFILE_VIEWED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            ProfileViewedEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              viewerName: data.viewerName,
              viewerCompany: data.viewerCompany || data.company,
              profileUrl: data.profileUrl || `${frontendUrl}/profile`,
            }),
          );
          return {
            title: 'Your Profile Was Viewed',
            message: `${data.viewerName || data.viewerCompany || 'Someone'} viewed your profile.`,
            htmlContent: html,
          };
        },

      [`${NotificationType.CV_FEEDBACK}_${NotificationChannel.EMAIL}`]: async (
        data,
      ) => {
        const html = await render(
          CvFeedbackEmail({
            userFirstname: data.userFirstname || data.firstName || 'there',
            feedback: data.feedback || 'No feedback provided.',
            feedbackUrl: data.feedbackUrl || `${frontendUrl}/profile/cv`,
          }),
        );
        return {
          title: 'CV Feedback Received',
          message: "You've received feedback on your CV/resume.",
          htmlContent: html,
        };
      },

      // Report Related
      [`${NotificationType.REPORT_CREATED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            ReportCreatedEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              reportType: data.reportType || 'report',
              reportId: data.reportId || data.id || 'N/A',
              reportUrl:
                data.reportUrl ||
                `${frontendUrl}/reports/${data.reportId || ''}`,
            }),
          );
          return {
            title: 'Report Created',
            message: `Your ${data.reportType || 'report'} has been successfully created.`,
            htmlContent: html,
          };
        },

      [`${NotificationType.REPORT_STATUS_CHANGED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            ReportStatusChangedEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              reportType: data.reportType || 'report',
              status: data.status || 'updated',
              reportUrl:
                data.reportUrl ||
                `${frontendUrl}/reports/${data.reportId || ''}`,
            }),
          );
          return {
            title: 'Report Status Updated',
            message: `The status of your ${data.reportType || 'report'} has been updated.`,
            htmlContent: html,
          };
        },

      [`${NotificationType.REPORT_ASSIGNED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            ReportAssignedEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              reportType: data.reportType || 'report',
              assignedTo: data.assignedTo,
              reportUrl:
                data.reportUrl ||
                `${frontendUrl}/reports/${data.reportId || ''}`,
            }),
          );
          return {
            title: 'Report Assigned',
            message: `A ${data.reportType || 'report'} has been assigned to you.`,
            htmlContent: html,
          };
        },

      [`${NotificationType.REPORT_RESOLVED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            ReportResolvedEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              reportType: data.reportType || 'report',
              resolution: data.resolution,
              reportUrl:
                data.reportUrl ||
                `${frontendUrl}/reports/${data.reportId || ''}`,
            }),
          );
          return {
            title: 'Report Resolved',
            message: `Your ${data.reportType || 'report'} has been resolved.`,
            htmlContent: html,
          };
        },

      [`${NotificationType.REPORT_DISMISSED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            ReportDismissedEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              reportType: data.reportType || 'report',
              reason: data.reason,
              reportUrl:
                data.reportUrl ||
                `${frontendUrl}/reports/${data.reportId || ''}`,
            }),
          );
          return {
            title: 'Report Dismissed',
            message: `Your ${data.reportType || 'report'} has been dismissed.`,
            htmlContent: html,
          };
        },

      // System
      [`${NotificationType.EMAIL_VERIFIED}_${NotificationChannel.EMAIL}`]:
        async (data) => {
          const html = await render(
            EmailVerifiedEmail({
              userFirstname: data.userFirstname || data.firstName || 'there',
              profileUrl: data.profileUrl || `${frontendUrl}/profile`,
            }),
          );
          return {
            title: 'Email Verified',
            message: 'Your email address has been successfully verified.',
            htmlContent: html,
          };
        },
      [`${NotificationType.APPLICATION_RECEIVED}_${NotificationChannel.WEBSOCKET}`]:
        async (data) => ({
          title: 'Application Submitted',
          message: `Your application for ${data.jobTitle || 'the position'} at ${data.companyName || 'the company'} has been submitted successfully.`,
          htmlContent: null,
        }),

      [`${NotificationType.APPLICATION_RECEIVED}_${NotificationChannel.PUSH}`]:
        async (data) => ({
          title: 'Application Submitted',
          message: `Your application for ${data.jobTitle || 'the position'} has been submitted.`,
          htmlContent: null,
        }),

      [`${NotificationType.APPLICATION_STATUS_CHANGED}_${NotificationChannel.WEBSOCKET}`]:
        async (data) => {
          const statusText = data.newStatus || data.status || 'updated';
          return {
            title: 'Application Status Changed',
            message: `Your application for ${data.jobTitle || 'the position'} status has been updated to ${statusText}.`,
            htmlContent: null,
          };
        },

      [`${NotificationType.APPLICATION_STATUS_CHANGED}_${NotificationChannel.PUSH}`]:
        async (data) => {
          const statusText = data.newStatus || data.status || 'updated';
          return {
            title: 'Application Update',
            message: `Application status changed to ${statusText}.`,
            htmlContent: null,
          };
        },

      [`${NotificationType.APPLICATION_SHORTLISTED}_${NotificationChannel.WEBSOCKET}`]:
        async (data) => ({
          title: '🎉 Application Shortlisted!',
          message: `Congratulations! Your application for ${data.jobTitle || 'the position'} at ${data.companyName || 'the company'} has been shortlisted.`,
          htmlContent: null,
        }),

      [`${NotificationType.APPLICATION_SHORTLISTED}_${NotificationChannel.PUSH}`]:
        async (data) => ({
          title: '🎉 Application Shortlisted!',
          message: `Your application for ${data.jobTitle || 'the position'} has been shortlisted!`,
          htmlContent: null,
        }),

      [`${NotificationType.APPLICATION_REJECTED}_${NotificationChannel.WEBSOCKET}`]:
        async (data) => ({
          title: 'Application Update',
          message: `Update on your application for ${data.jobTitle || 'the position'} at ${data.companyName || 'the company'}.`,
          htmlContent: null,
        }),

      [`${NotificationType.APPLICATION_REJECTED}_${NotificationChannel.PUSH}`]:
        async (data) => ({
          title: 'Application Update',
          message: `Update on your application for ${data.jobTitle || 'the position'}.`,
          htmlContent: null,
        }),

      [`${NotificationType.APPLICATION_HIRED}_${NotificationChannel.WEBSOCKET}`]:
        async (data) => ({
          title: "🎊 Congratulations! You're Hired!",
          message: `Great news! You've been selected for ${data.jobTitle || 'the position'} at ${data.companyName || 'the company'}. Welcome to the team!`,
          htmlContent: null,
        }),

      [`${NotificationType.APPLICATION_HIRED}_${NotificationChannel.PUSH}`]:
        async (data) => ({
          title: "🎊 You're Hired!",
          message: `Congratulations! You've been selected for ${data.jobTitle || 'the position'}.`,
          htmlContent: null,
        }),

      // Interview Related - WEBSOCKET & PUSH templates
      [`${NotificationType.INTERVIEW_SCHEDULED}_${NotificationChannel.WEBSOCKET}`]:
        async (data) => {
          const date = data.interviewDate || data.scheduledDate || 'TBD';
          const time = data.interviewTime || 'TBD';
          return {
            title: 'Interview Scheduled',
            message: `Your interview for ${data.jobTitle || 'the position'} has been scheduled for ${date} at ${time}.`,
            htmlContent: null,
          };
        },

      [`${NotificationType.INTERVIEW_SCHEDULED}_${NotificationChannel.PUSH}`]:
        async (data) => {
          const date = data.interviewDate || data.scheduledDate || 'TBD';
          return {
            title: 'Interview Scheduled',
            message: `Interview scheduled for ${data.jobTitle || 'the position'} on ${date}.`,
            htmlContent: null,
          };
        },

      [`${NotificationType.INTERVIEW_RESCHEDULED}_${NotificationChannel.WEBSOCKET}`]:
        async (data) => {
          const newDate =
            data.newDate ||
            data.newScheduledDate ||
            data.interviewDate ||
            'new date';
          return {
            title: 'Interview Rescheduled',
            message: `Your interview for ${data.jobTitle || 'the position'} has been rescheduled to ${newDate}.`,
            htmlContent: null,
          };
        },

      [`${NotificationType.INTERVIEW_RESCHEDULED}_${NotificationChannel.PUSH}`]:
        async (data) => ({
          title: 'Interview Rescheduled',
          message: `Your interview for ${data.jobTitle || 'the position'} has been rescheduled.`,
          htmlContent: null,
        }),

      [`${NotificationType.INTERVIEW_CANCELLED}_${NotificationChannel.WEBSOCKET}`]:
        async (data) => ({
          title: 'Interview Cancelled',
          message: `Your interview for ${data.jobTitle || 'the position'} has been cancelled.`,
          htmlContent: null,
        }),

      [`${NotificationType.INTERVIEW_CANCELLED}_${NotificationChannel.PUSH}`]:
        async (data) => ({
          title: 'Interview Cancelled',
          message: `Your interview for ${data.jobTitle || 'the position'} has been cancelled.`,
          htmlContent: null,
        }),

      // Offer Related - WEBSOCKET & PUSH templates
      [`${NotificationType.OFFER_SENT}_${NotificationChannel.WEBSOCKET}`]:
        async (data) => ({
          title: '🎉 Job Offer Received!',
          message: `You've received a job offer for ${data.jobTitle || 'the position'} at ${data.companyName || 'the company'}.`,
          htmlContent: null,
        }),

      [`${NotificationType.OFFER_SENT}_${NotificationChannel.PUSH}`]: async (
        data,
      ) => ({
        title: '🎉 Job Offer Received!',
        message: `You've received a job offer for ${data.jobTitle || 'the position'}.`,
        htmlContent: null,
      }),

      [`${NotificationType.OFFER_ACCEPTED}_${NotificationChannel.WEBSOCKET}`]:
        async (data) => ({
          title: '🎊 Offer Accepted!',
          message: `Congratulations! You've accepted the offer for ${data.jobTitle || 'the position'} at ${data.companyName || 'the company'}.`,
          htmlContent: null,
        }),

      [`${NotificationType.OFFER_ACCEPTED}_${NotificationChannel.PUSH}`]:
        async (data) => ({
          title: '🎊 Offer Accepted!',
          message: `You've accepted the offer for ${data.jobTitle || 'the position'}.`,
          htmlContent: null,
        }),

      [`${NotificationType.OFFER_REJECTED}_${NotificationChannel.WEBSOCKET}`]:
        async (data) => ({
          title: 'Offer Update',
          message: `Update on your offer for ${data.jobTitle || 'the position'} at ${data.companyName || 'the company'}.`,
          htmlContent: null,
        }),

      [`${NotificationType.OFFER_REJECTED}_${NotificationChannel.PUSH}`]:
        async (data) => ({
          title: 'Offer Update',
          message: `Update on your offer for ${data.jobTitle || 'the position'}.`,
          htmlContent: null,
        }),

      // Job Related - WEBSOCKET & PUSH templates
      [`${NotificationType.JOB_RECOMMENDATION}_${NotificationChannel.WEBSOCKET}`]:
        async (data) => {
          const jobCount = data.jobs?.length || 1;
          return {
            title: `New Job${jobCount > 1 ? 's' : ''} Matching Your Profile`,
            message: `We found ${jobCount} new job${jobCount > 1 ? 's' : ''} that match your profile. Check them out!`,
            htmlContent: null,
          };
        },

      [`${NotificationType.JOB_RECOMMENDATION}_${NotificationChannel.PUSH}`]:
        async (data) => {
          const jobCount = data.jobs?.length || 1;
          return {
            title: `New Job${jobCount > 1 ? 's' : ''} For You`,
            message: `${jobCount} new job${jobCount > 1 ? 's' : ''} matching your profile.`,
            htmlContent: null,
          };
        },
    };

    const templateFn =
      templates[templateKey] || this.getDefaultTemplate(type, channel);
    return await templateFn(eventData);
  }

  private getDefaultTemplate(
    type: NotificationType,
    channel: NotificationChannel,
  ): (data: any) => Promise<NotificationTemplate> {
    return async (data: any) => ({
      title: 'Notification',
      message: data.message || 'You have a new notification',
      htmlContent:
        channel === NotificationChannel.EMAIL
          ? `<html><body><h1>Notification</h1><p>${data.message || 'You have a new notification'}</p></body></html>`
          : null,
    });
  }
}
