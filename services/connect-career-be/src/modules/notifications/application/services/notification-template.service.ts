// import { Injectable } from "@nestjs/common";
// import { NotificationChannel, NotificationType } from "../../domain/entities/notification.entity";
// import { IDomainEvent } from "src/shared/domain";

// export interface NotificationTemplate { 
//     title: string; 
//     message: string; 
//     htmlContent: string | null;
// }

// @Injectable()
// export class NotificationTemplateService {
//     async getTemplate(type: NotificationType,
//         type: NotificationType,
//         channel: NotificationChannel,
//         event: IDomainEvent
//     ): Promise<NotificationTemplate> { 
//         const eventData = event as any;
//             // Template mapping
//     const templates: Record<string, (data: any) => NotificationTemplate> = {
//         [`${NotificationType.APPLICATION_RECEIVED}_${NotificationChannel.EMAIL}`]: (data) => ({
//           title: 'Application Submitted Successfully',
//           message: `Your application for "${data.jobTitle}" has been submitted successfully.`,
//           htmlContent: this.renderEmailTemplate('application-received', data),
//         }),
//         [`${NotificationType.APPLICATION_SHORTLISTED}_${NotificationChannel.PUSH}`]: (data) => ({
//           title: '🎉 Application Shortlisted!',
//           message: `Congratulations! Your application for "${data.jobTitle}" has been shortlisted.`,
//         }),
//         [`${NotificationType.APPLICATION_HIRED}_${NotificationChannel.EMAIL}`]: (data) => ({
//           title: '🎊 Congratulations! You\'re Hired!',
//           message: `Great news! You've been selected for "${data.jobTitle}". Welcome to the team!`,
//           htmlContent: this.renderEmailTemplate('application-hired', data),
//         }),
//         // Add more templates
//       };  
//       const templateKey = `${type}_${channel}`;
//       const templateFn = templates[templateKey] || this.getDefaultTemplate(type, channel);
      
//       return templateFn(eventData);
//     }

//     private getDefaultTemplate(
//         type: NotificationType,
//         channel: NotificationChannel,
//       ): (data: any) => NotificationTemplate {
//         return (data: any) => ({
//           title: 'Notification',
//           message: data.message || 'You have a new notification',
//         });
//       }
    
//       private renderEmailTemplate(templateName: string, data: any): string {
//         // Use React Email or similar for HTML templates
//         // This is a placeholder
//         return `<html><body><h1>${data.title}</h1><p>${data.message}</p></body></html>`;
//       }
// }