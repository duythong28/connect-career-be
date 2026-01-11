import {
    Heading,
    Text,
    Section,
    Button,
    Row,
    Column,
  } from '@react-email/components';
  import * as React from 'react';
  import BaseEmail from './base-email.template';
  
  // --- Interview Scheduled ---
  interface InterviewScheduledProps {
    userFirstname: string;
    jobTitle: string;
    companyName: string;
    interviewDate: string;
    interviewTime: string;
    location?: string;
    meetingLink?: string;
    interviewType?: string;
    interviewUrl?: string;
  }
  
  export const InterviewScheduledEmail = ({
    userFirstname,
    jobTitle,
    companyName,
    interviewDate,
    interviewTime,
    location,
    meetingLink,
    interviewType = 'Interview',
    interviewUrl = '#',
  }: InterviewScheduledProps) => (
    <BaseEmail
      userFirstname={userFirstname}
      preview={`Interview scheduled for ${jobTitle} on ${interviewDate}`}
    >
      <Heading style={pageTitle}>Interview Scheduled</Heading>
      <Text style={paragraph}>
        Your {interviewType.toLowerCase()} for <strong>{jobTitle}</strong> at <strong>{companyName}</strong> has been scheduled.
      </Text>
      
      <Section style={infoCard}>
        <Row style={{ marginBottom: '12px' }}>
          <Column style={infoLabel}>📅 Date</Column>
          <Column style={infoValue}>{interviewDate}</Column>
        </Row>
        <Row style={{ marginBottom: '12px' }}>
          <Column style={infoLabel}>🕐 Time</Column>
          <Column style={infoValue}>{interviewTime}</Column>
        </Row>
        {location && (
          <Row style={{ marginBottom: '12px' }}>
            <Column style={infoLabel}>📍 Location</Column>
            <Column style={infoValue}>{location}</Column>
          </Row>
        )}
        {meetingLink && (
          <Row>
            <Column style={infoLabel}>🔗 Link</Column>
            <Column style={infoValue}>
              <a href={meetingLink} style={linkStyle}>{meetingLink}</a>
            </Column>
          </Row>
        )}
      </Section>
  
      <Text style={paragraph}>
        Please make sure to be on time and prepared. Good luck!
      </Text>
      
      <Section style={btnContainer}>
        <Button style={buttonPrimary} href={interviewUrl}>
          View Interview Details
        </Button>
        {meetingLink && (
          <Button style={buttonSecondary} href={meetingLink}>
            Join Meeting
          </Button>
        )}
      </Section>
    </BaseEmail>
  );
  
  // --- Interview Reminder ---
  interface InterviewReminderProps {
    userFirstname: string;
    jobTitle: string;
    companyName: string;
    interviewDate: string;
    interviewTime: string;
    meetingLink?: string;
    interviewUrl?: string;
  }
  
  export const InterviewReminderEmail = ({
    userFirstname,
    jobTitle,
    companyName,
    interviewDate,
    interviewTime,
    meetingLink,
    interviewUrl = '#',
  }: InterviewReminderProps) => (
    <BaseEmail
      userFirstname={userFirstname}
      preview={`Reminder: Interview for ${jobTitle} is tomorrow`}
    >
      <Heading style={pageTitle}>⏰ Interview Reminder</Heading>
      <Text style={paragraph}>
        This is a friendly reminder that you have an interview scheduled for <strong>{jobTitle}</strong> at <strong>{companyName}</strong>.
      </Text>
      
      <Section style={reminderBox}>
        <Text style={labelTitle}>Scheduled For</Text>
        <Text style={reminderText}>
          <strong>{interviewDate}</strong> at <strong>{interviewTime}</strong>
        </Text>
      </Section>
  
      <Text style={paragraph}>
        Make sure you're prepared and have all necessary documents ready.
      </Text>
      
      <Section style={btnContainer}>
        <Button style={buttonPrimary} href={interviewUrl}>
          View Details
        </Button>
        {meetingLink && (
          <Button style={buttonSecondary} href={meetingLink}>
            Join Meeting
          </Button>
        )}
      </Section>
    </BaseEmail>
  );
  
  // --- Interview Cancelled ---
  interface InterviewCancelledProps {
    userFirstname: string;
    jobTitle: string;
    companyName: string;
    reason?: string;
    rescheduleUrl?: string;
  }
  
  export const InterviewCancelledEmail = ({
    userFirstname,
    jobTitle,
    companyName,
    reason,
    rescheduleUrl = '#',
  }: InterviewCancelledProps) => (
    <BaseEmail
      userFirstname={userFirstname}
      preview={`Interview for ${jobTitle} has been cancelled`}
    >
      <Heading style={pageTitle}>Interview Cancelled</Heading>
      <Text style={paragraph}>
        We're sorry to inform you that your interview for <strong>{jobTitle}</strong> at <strong>{companyName}</strong> has been cancelled.
      </Text>
      
      {reason && (
        <Section style={feedbackBox}>
          <Text style={labelTitle}>Reason</Text>
          <Text style={feedbackText}>{reason}</Text>
        </Section>
      )}
      
      <Text style={paragraph}>
        We'll keep you updated if the interview is rescheduled. You can also check for new interview slots.
      </Text>
      
      <Section style={btnContainer}>
        <Button style={buttonPrimary} href={rescheduleUrl}>
          Check Available Slots
        </Button>
      </Section>
    </BaseEmail>
  );
  
  // --- Interview Rescheduled ---
  interface InterviewRescheduledProps {
    userFirstname: string;
    jobTitle: string;
    companyName: string;
    oldDate: string;
    oldTime: string;
    newDate: string;
    newTime: string;
    meetingLink?: string;
    interviewUrl?: string;
  }
  
  export const InterviewRescheduledEmail = ({
    userFirstname,
    jobTitle,
    companyName,
    oldDate,
    oldTime,
    newDate,
    newTime,
    meetingLink,
    interviewUrl = '#',
  }: InterviewRescheduledProps) => (
    <BaseEmail
      userFirstname={userFirstname}
      preview={`Interview for ${jobTitle} has been rescheduled`}
    >
      <Heading style={pageTitle}>Interview Rescheduled</Heading>
      <Text style={paragraph}>
        Your interview for <strong>{jobTitle}</strong> at <strong>{companyName}</strong> has been rescheduled.
      </Text>
      
      <Section style={changeBox}>
        <Section style={{ marginBottom: '16px' }}>
          <Text style={labelTitle}>Previous Schedule</Text>
          <Text style={oldValue}>{oldDate} at {oldTime}</Text>
        </Section>
        <Section>
          <Text style={labelTitle}>New Schedule</Text>
          <Text style={newValue}>{newDate} at {newTime}</Text>
        </Section>
      </Section>
      
      <Text style={paragraph}>
        Please update your calendar accordingly.
      </Text>
      
      <Section style={btnContainer}>
        <Button style={buttonPrimary} href={interviewUrl}>
          View Updated Details
        </Button>
        {meetingLink && (
          <Button style={buttonSecondary} href={meetingLink}>
            Join Meeting
          </Button>
        )}
      </Section>
    </BaseEmail>
  );
  
  // --- Shared Design System Styles ---
  
  const pageTitle = {
    fontSize: '24px',
    fontWeight: '700' as const,
    color: 'var(--foreground)',
    lineHeight: '32px',
    margin: '0 0 16px 0',
    textAlign: 'center' as const,
  };
  
  const paragraph = {
    fontSize: '14px',
    color: 'var(--muted-foreground)',
    lineHeight: '1.5',
    margin: '0 0 16px 0',
  };
  
  const labelTitle = {
    fontSize: '12px',
    fontWeight: '700' as const,
    color: 'var(--muted-foreground)',
    margin: '0 0 4px 0',
    textTransform: 'uppercase' as const,
  };
  
  const btnContainer = {
    textAlign: 'center' as const,
    margin: '24px 0',
  };
  
  const buttonPrimary = {
    backgroundColor: 'var(--primary)',
    borderRadius: '12px',
    color: 'var(--primary-foreground)',
    fontSize: '14px',
    fontWeight: '600' as const,
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    height: '40px',
    lineHeight: '40px',
    padding: '0 24px',
    margin: '0 4px 8px 4px',
  };
  
  const buttonSecondary = {
    backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    color: 'var(--foreground)',
    fontSize: '14px',
    fontWeight: '600' as const,
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    height: '40px',
    lineHeight: '40px',
    padding: '0 24px',
    margin: '0 4px 8px 4px',
  };
  
  const infoCard = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '20px',
    margin: '16px 0',
  };
  
  const infoLabel = {
    fontSize: '12px',
    fontWeight: '700' as const,
    color: 'var(--muted-foreground)',
    textTransform: 'uppercase' as const,
    width: '100px',
  };
  
  const infoValue = {
    fontSize: '14px',
    fontWeight: '600' as const,
    color: 'var(--foreground)',
  };
  
  const linkStyle = {
    color: 'var(--primary)',
    textDecoration: 'underline',
  };
  
  const reminderBox = {
    backgroundColor: 'var(--card)',
    border: '2px solid var(--primary)',
    borderRadius: '16px',
    padding: '16px',
    margin: '16px 0',
    textAlign: 'center' as const,
  };
  
  const reminderText = {
    fontSize: '16px',
    color: 'var(--foreground)',
    margin: '0',
    lineHeight: '1.5',
  };
  
  const feedbackBox = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '16px',
    margin: '16px 0',
  };
  
  const feedbackText = {
    fontSize: '14px',
    color: 'var(--foreground)',
    margin: '0',
    lineHeight: '1.5',
  };
  
  const changeBox = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '20px',
    margin: '16px 0',
  };
  
  const oldValue = {
    fontSize: '14px',
    color: 'var(--muted-foreground)',
    textDecoration: 'line-through',
    margin: '0',
  };
  
  const newValue = {
    fontSize: '16px',
    fontWeight: '700' as const,
    color: 'var(--primary)',
    margin: '0',
  };