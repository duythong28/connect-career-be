import {
    Heading,
    Text,
    Section,
    Button,
  } from '@react-email/components';
  import BaseEmail from './base-email.template';
  
  interface ApplicationReceivedProps {
    userFirstname: string;
    jobTitle: string;
    companyName: string;
    applicationUrl?: string;
  }
  
  export const ApplicationReceivedEmail = ({
    userFirstname,
    jobTitle,
    companyName,
    applicationUrl = '#',
  }: ApplicationReceivedProps) => (
    <BaseEmail
      userFirstname={userFirstname}
      preview={`Your application for ${jobTitle} has been submitted successfully`}
    >
      <Heading style={pageTitle}>Application Submitted Successfully</Heading>
      <Text style={paragraph}>
        Your application for <strong>{jobTitle}</strong> at <strong>{companyName}</strong> has been submitted successfully.
      </Text>
      <Text style={paragraph}>
        We'll keep you updated on the status of your application. You can track your application status in your dashboard.
      </Text>
      <Section style={btnContainer}>
        <Button style={buttonPrimary} href={applicationUrl}>
          View Application
        </Button>
      </Section>
    </BaseEmail>
  );
  
  // --- Application Status Changed ---
  interface ApplicationStatusChangedProps {
    userFirstname: string;
    jobTitle: string;
    companyName: string;
    status: string;
    applicationUrl?: string;
  }
  
  export const ApplicationStatusChangedEmail = ({
    userFirstname,
    jobTitle,
    companyName,
    status,
    applicationUrl = '#',
  }: ApplicationStatusChangedProps) => (
    <BaseEmail
      userFirstname={userFirstname}
      preview={`Your application status for ${jobTitle} has been updated`}
    >
      <Heading style={pageTitle}>Application Status Updated</Heading>
      <Text style={paragraph}>
        Your application for <strong>{jobTitle}</strong> at <strong>{companyName}</strong> has been updated.
      </Text>
      <Section style={statusBadge}>
        <Text style={statusText}>Status: {status}</Text>
      </Section>
      <Section style={btnContainer}>
        <Button style={buttonPrimary} href={applicationUrl}>
          View Details
        </Button>
      </Section>
    </BaseEmail>
  );
  
  // --- Application Shortlisted ---
  interface ApplicationShortlistedProps {
    userFirstname: string;
    jobTitle: string;
    companyName: string;
    applicationUrl?: string;
  }
  
  export const ApplicationShortlistedEmail = ({
    userFirstname,
    jobTitle,
    companyName,
    applicationUrl = '#',
  }: ApplicationShortlistedProps) => (
    <BaseEmail
      userFirstname={userFirstname}
      preview={`🎉 Congratulations! Your application for ${jobTitle} has been shortlisted`}
    >
      <Heading style={pageTitle}>🎉 Application Shortlisted!</Heading>
      <Text style={paragraph}>
        Great news! Your application for <strong>{jobTitle}</strong> at <strong>{companyName}</strong> has been shortlisted.
      </Text>
      <Text style={paragraph}>
        The hiring team is interested in learning more about you. Keep an eye on your inbox for further updates.
      </Text>
      <Section style={btnContainer}>
        <Button style={buttonPrimary} href={applicationUrl}>
          View Application
        </Button>
      </Section>
    </BaseEmail>
  );
  
  // --- Application Rejected ---
  interface ApplicationRejectedProps {
    userFirstname: string;
    jobTitle: string;
    companyName: string;
    feedback?: string;
    browseJobsUrl?: string;
  }
  
  export const ApplicationRejectedEmail = ({
    userFirstname,
    jobTitle,
    companyName,
    feedback,
    browseJobsUrl = '#',
  }: ApplicationRejectedProps) => (
    <BaseEmail
      userFirstname={userFirstname}
      preview={`Update on your application for ${jobTitle}`}
    >
      <Heading style={pageTitle}>Application Update</Heading>
      <Text style={paragraph}>
        Thank you for your interest in the <strong>{jobTitle}</strong> position at <strong>{companyName}</strong>.
      </Text>
      <Text style={paragraph}>
        After careful consideration, we've decided to move forward with other candidates at this time.
      </Text>
      {feedback && (
        <Section style={feedbackBox}>
          <Text style={labelTitle}>Feedback:</Text>
          <Text style={feedbackText}>{feedback}</Text>
        </Section>
      )}
      <Text style={paragraph}>
        Don't be discouraged! Keep exploring opportunities that match your skills.
      </Text>
      <Section style={btnContainer}>
        <Button style={buttonSecondary} href={browseJobsUrl}>
          Browse More Jobs
        </Button>
      </Section>
    </BaseEmail>
  );
  
  // --- Application Hired ---
  interface ApplicationHiredProps {
    userFirstname: string;
    jobTitle: string;
    companyName: string;
    offerDetails?: string;
    nextStepsUrl?: string;
  }
  
  export const ApplicationHiredEmail = ({
    userFirstname,
    jobTitle,
    companyName,
    offerDetails,
    nextStepsUrl = '#',
  }: ApplicationHiredProps) => (
    <BaseEmail
      userFirstname={userFirstname}
      preview={`🎊 Congratulations! You've been hired for ${jobTitle}`}
    >
      <Heading style={pageTitle}>🎊 Congratulations! You're Hired!</Heading>
      <Text style={paragraph}>
        We're thrilled to inform you that you've been selected for the <strong>{jobTitle}</strong> position at <strong>{companyName}</strong>!
      </Text>
      {offerDetails && (
        <Section style={infoBox}>
          <Text style={infoText}>{offerDetails}</Text>
        </Section>
      )}
      <Text style={paragraph}>
        Welcome to the team! We're excited to have you on board and look forward to working with you.
      </Text>
      <Section style={btnContainer}>
        <Button style={buttonPrimary} href={nextStepsUrl}>
          View Next Steps
        </Button>
      </Section>
    </BaseEmail>
  );
  
  // --- Application Deadline Reminder ---
  interface ApplicationDeadlineReminderProps {
    userFirstname: string;
    jobTitle: string;
    companyName: string;
    deadline: string;
    applicationUrl?: string;
  }
  
  export const ApplicationDeadlineReminderEmail = ({
    userFirstname,
    jobTitle,
    companyName,
    deadline,
    applicationUrl = '#',
  }: ApplicationDeadlineReminderProps) => (
    <BaseEmail
      userFirstname={userFirstname}
      preview={`Reminder: Application deadline for ${jobTitle} is approaching`}
    >
      <Heading style={pageTitle}>⏰ Application Deadline Reminder</Heading>
      <Text style={paragraph}>
        This is a friendly reminder that the application deadline for <strong>{jobTitle}</strong> at <strong>{companyName}</strong> is approaching.
      </Text>
      <Section style={deadlineBox}>
        <Text style={deadlineText}>Deadline: {deadline}</Text>
      </Section>
      <Text style={paragraph}>
        Make sure to complete your application before the deadline to be considered.
      </Text>
      <Section style={btnContainer}>
        <Button style={buttonPrimary} href={applicationUrl}>
          Complete Application
        </Button>
      </Section>
    </BaseEmail>
  );
  
  // --- CareerHub Design System Styles ---
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
    margin: '0 0 8px 0',
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
  };
  
  const statusBadge = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '12px',
    margin: '16px 0',
    textAlign: 'center' as const,
  };
  
  const statusText = {
    fontSize: '14px',
    fontWeight: '600' as const,
    color: 'var(--primary)',
    margin: '0',
  };
  
  const feedbackBox = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '16px',
    margin: '16px 0',
  };
  
  const feedbackText = {
    fontSize: '14px',
    color: 'var(--foreground)',
    margin: '0',
    lineHeight: '1.5',
  };
  
  const infoBox = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--primary)',
    borderRadius: '12px',
    padding: '16px',
    margin: '16px 0',
  };
  
  const infoText = {
    fontSize: '14px',
    color: 'var(--primary)',
    margin: '0',
    lineHeight: '1.5',
  };
  
  const deadlineBox = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '16px',
    margin: '16px 0',
    textAlign: 'center' as const,
  };
  
  const deadlineText = {
    fontSize: '16px',
    fontWeight: '700' as const,
    color: 'var(--foreground)',
    margin: '0',
  };