# Notification Use Cases

This document lists all notification use cases implemented in the ConnectCareer application.

## Overview

The notification system automatically sends notifications to users when important events occur in the application. Notifications are sent via multiple channels (Email, WebSocket, SMS, Push) based on user preferences.

## Notification Types

### 1. Application-Related Notifications

#### 1.1 Application Received (`APPLICATION_RECEIVED`)
**Trigger:** When a candidate submits an application for a job
- **Recipients:** 
  - Candidate (confirmation)
  - Recruiter/Job Owner (new application alert)
- **Channels:** Email, WebSocket
- **Event:** `ApplicationCreatedEvent`

#### 1.2 Application Status Changed (`APPLICATION_STATUS_CHANGED`)
**Trigger:** When application status changes (generic status update)
- **Recipients:** Candidate
- **Channels:** Email, WebSocket
- **Event:** `ApplicationStatusChangedEvent`

#### 1.3 Application Shortlisted (`APPLICATION_SHORTLISTED`)
**Trigger:** When application status changes to `SHORTLISTED`
- **Recipients:** Candidate
- **Channels:** Email, WebSocket, Push
- **Event:** `ApplicationStatusChangedEvent` (when newStatus = SHORTLISTED)

#### 1.4 Application Rejected (`APPLICATION_REJECTED`)
**Trigger:** When application status changes to `REJECTED`
- **Recipients:** Candidate
- **Channels:** Email, WebSocket
- **Event:** `ApplicationStatusChangedEvent` (when newStatus = REJECTED)

#### 1.5 Application Hired (`APPLICATION_HIRED`)
**Trigger:** When application status changes to `HIRED`
- **Recipients:** Candidate
- **Channels:** Email, WebSocket, Push
- **Event:** `ApplicationStatusChangedEvent` (when newStatus = HIRED)

#### 1.6 Application Deadline Reminder (`APPLICATION_DEADLINE_REMINDER`)
**Trigger:** Scheduled reminder before application deadline
- **Recipients:** Candidate
- **Channels:** Email, Push
- **Note:** Requires scheduled notification implementation

### 2. Interview-Related Notifications

#### 2.1 Interview Scheduled (`INTERVIEW_SCHEDULED`)
**Trigger:** When an interview is scheduled for a candidate
- **Recipients:** 
  - Candidate
  - Interviewer (if assigned)
- **Channels:** Email, WebSocket
- **Event:** `InterviewScheduledEvent`
- **Metadata:** Interview date, time, location, meeting link, duration

#### 2.2 Interview Reminder (`INTERVIEW_REMINDER`)
**Trigger:** Scheduled reminder before interview (e.g., 24 hours before)
- **Recipients:** Candidate, Interviewer
- **Channels:** Email, Push, SMS
- **Note:** Requires scheduled notification implementation

#### 2.3 Interview Cancelled (`INTERVIEW_CANCELLED`)
**Trigger:** When an interview is cancelled
- **Recipients:** Candidate, Interviewer
- **Channels:** Email, WebSocket
- **Event:** `InterviewCancelledEvent`
- **Metadata:** Cancellation reason

#### 2.4 Interview Rescheduled (`INTERVIEW_RESCHEDULED`)
**Trigger:** When an interview is rescheduled to a new time
- **Recipients:** Candidate, Interviewer
- **Channels:** Email, WebSocket
- **Event:** `InterviewRescheduledEvent`
- **Metadata:** Old date, new date

### 3. Offer-Related Notifications

#### 3.1 Offer Sent (`OFFER_SENT`)
**Trigger:** When a job offer is sent to a candidate
- **Recipients:** Candidate
- **Channels:** Email, WebSocket
- **Event:** `OfferSentEvent`
- **Metadata:** Offer details, salary, benefits

#### 3.2 Offer Accepted (`OFFER_ACCEPTED`)
**Trigger:** When a candidate accepts a job offer
- **Recipients:** 
  - Candidate (confirmation)
  - Recruiter/Employer (notification)
- **Channels:** Email, WebSocket
- **Event:** `OfferAcceptedEvent`

#### 3.3 Offer Rejected (`OFFER_REJECTED`)
**Trigger:** When a candidate rejects a job offer
- **Recipients:** 
  - Candidate (confirmation)
  - Recruiter/Employer (notification)
- **Channels:** Email, WebSocket
- **Event:** `OfferRejectedEvent`
- **Metadata:** Rejection reason

### 4. Communication Notifications

#### 4.1 New Message (`NEW_MESSAGE`)
**Trigger:** When a new message is received
- **Recipients:** Message recipient
- **Channels:** WebSocket, Push, Email (if offline)
- **Note:** Requires messaging system integration

#### 4.2 Mention (`MENTION`)
**Trigger:** When a user is mentioned in a message or comment
- **Recipients:** Mentioned user
- **Channels:** WebSocket, Push, Email
- **Note:** Requires messaging system integration

### 5. Job-Related Notifications

#### 5.1 Job Recommendation (`JOB_RECOMMENDATION`)
**Trigger:** When a job matching candidate's profile is posted
- **Recipients:** Candidate
- **Channels:** Email, Push, WebSocket
- **Note:** Requires recommendation engine integration

#### 5.2 Job Deadline Approaching (`JOB_DEADLINE_APPROACHING`)
**Trigger:** Scheduled reminder before job application deadline
- **Recipients:** Candidates who viewed but didn't apply
- **Channels:** Email, Push
- **Note:** Requires scheduled notification implementation

### 6. Profile-Related Notifications

#### 6.1 Profile Viewed (`PROFILE_VIEWED`)
**Trigger:** When a candidate's profile is viewed by a recruiter
- **Recipients:** Candidate
- **Channels:** WebSocket, Email (daily digest)
- **Note:** Requires profile view tracking integration

#### 6.2 CV Feedback (`CV_FEEDBACK`)
**Trigger:** When feedback is provided on a candidate's CV
- **Recipients:** Candidate
- **Channels:** Email, WebSocket
- **Note:** Requires CV feedback system integration

### 7. System Notifications

#### 7.1 User Registered (`USER_REGISTERED`)
**Trigger:** When a new user registers
- **Recipients:** New user
- **Channels:** Email
- **Event:** `UserRegisteredEvent`
- **Purpose:** Email verification

#### 7.2 Password Reset (`PASSWORD_RESET`)
**Trigger:** When user requests password reset
- **Recipients:** User
- **Channels:** Email
- **Note:** Requires password reset integration

#### 7.3 Email Verified (`EMAIL_VERIFIED`)
**Trigger:** When user verifies their email
- **Recipients:** User
- **Channels:** Email, WebSocket
- **Note:** Requires email verification integration

## Implementation Status

### ✅ Implemented
- Application Created
- Application Status Changed (including Shortlisted, Rejected, Hired)
- Interview Scheduled
- Interview Cancelled
- Interview Rescheduled
- Offer Sent
- Offer Accepted
- Offer Rejected
- User Registered

### ⏳ Pending Implementation
- Application Deadline Reminder (requires scheduler)
- Interview Reminder (requires scheduler)
- New Message (requires messaging system)
- Mention (requires messaging system)
- Job Recommendation (requires recommendation engine)
- Job Deadline Approaching (requires scheduler)
- Profile Viewed (requires tracking)
- CV Feedback (requires feedback system)
- Password Reset (requires auth integration)
- Email Verified (requires auth integration)

## Event Flow

1. **Domain Event Created:** When an action occurs (e.g., application created), a domain event is published
2. **Event Handler:** The corresponding event handler receives the event
3. **Notification Orchestrator:** Handler calls `NotificationOrchestratorService.sendToRecipient()`
4. **User Preferences:** System checks user notification preferences
5. **Channel Selection:** Appropriate channels are selected based on preferences
6. **Template Generation:** Notification template is generated for each channel
7. **Queue Notification:** Notification is queued via `NotificationQueueService`
8. **Processing:** `NotificationProcessor` processes the queue and sends via appropriate provider
9. **Status Update:** Notification status is updated (SENT, FAILED, etc.)

## Integration Points

### Application Service
- `createApplication()` → Publishes `ApplicationCreatedEvent`
- `updateApplicationStatus()` → Publishes `ApplicationStatusChangedEvent`

### Interview Service
- `scheduleInterview()` → Publishes `InterviewScheduledEvent`
- `cancelInterview()` → Publishes `InterviewCancelledEvent`
- `rescheduleInterview()` → Publishes `InterviewRescheduledEvent`

### Offer Service
- `createOffer()` → Publishes `OfferSentEvent`
- `acceptOffer()` → Publishes `OfferAcceptedEvent`
- `rejectOffer()` → Publishes `OfferRejectedEvent`

## Configuration

User notification preferences can be configured per notification type and channel. The system respects these preferences when sending notifications.

## Future Enhancements

1. **Scheduled Notifications:** Implement cron jobs for reminders
2. **Notification Digests:** Daily/weekly digest emails
3. **Notification Preferences UI:** Allow users to configure preferences
4. **Notification Templates:** Rich HTML email templates
5. **Multi-language Support:** Support for multiple languages
6. **Notification Analytics:** Track open rates, click rates, etc.

