import {
    Heading,
    Text,
    Section,
    Button,
  } from '@react-email/components';
  import * as React from 'react';
  import BaseEmail from './base-email.template';
  
  // --- Profile Viewed ---
  interface ProfileViewedProps {
    userFirstname: string;
    viewerName?: string;
    viewerCompany?: string;
    profileUrl?: string;
  }
  
  export const ProfileViewedEmail = ({
    userFirstname,
    viewerName,
    viewerCompany,
    profileUrl = '#',
  }: ProfileViewedProps) => (
    <BaseEmail
      userFirstname={userFirstname}
      preview="Someone viewed your profile"
    >
      <Heading style={pageTitle}>👤 Your Profile Was Viewed</Heading>
      
      <Text style={paragraph}>
        {viewerName || viewerCompany 
          ? `${viewerName || viewerCompany} viewed your profile.`
          : 'Someone viewed your profile recently.'}
      </Text>
  
      {viewerCompany && (
        <Section style={infoCard}>
          <Text style={labelTitle}>Company</Text>
          <Text style={infoValue}>{viewerCompany}</Text>
        </Section>
      )}
  
      <Text style={paragraph}>
        Keep your profile updated to attract more opportunities!
      </Text>
  
      <Section style={btnContainer}>
        <Button style={buttonPrimary} href={profileUrl}>
          View Your Profile
        </Button>
      </Section>
    </BaseEmail>
  );
  
  // --- CV Feedback ---
  interface CvFeedbackProps {
    userFirstname: string;
    feedback: string;
    feedbackUrl?: string;
  }
  
  export const CvFeedbackEmail = ({
    userFirstname,
    feedback,
    feedbackUrl = '#',
  }: CvFeedbackProps) => (
    <BaseEmail
      userFirstname={userFirstname}
      preview="You received feedback on your CV"
    >
      <Heading style={pageTitle}>📝 CV Feedback Received</Heading>
      
      <Text style={paragraph}>
        You've received feedback on your CV/resume.
      </Text>
  
      <Section style={feedbackCard}>
        <Text style={labelTitle}>Feedback Details</Text>
        <Text style={infoValue}>{feedback}</Text>
      </Section>
  
      <Text style={paragraph}>
        Use this feedback to improve your CV and increase your chances of landing your dream job.
      </Text>
  
      <Section style={btnContainer}>
        <Button style={buttonPrimary} href={feedbackUrl}>
          View Feedback
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
    height: '40px', // h-10
    lineHeight: '40px',
    padding: '0 24px',
  };
  
  const infoCard = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '16px',
    margin: '16px 0',
  };
  
  const feedbackCard = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderLeft: '4px solid var(--primary)', // Preserving the specific feedback accent
    borderRadius: '12px',
    padding: '16px',
    margin: '16px 0',
  };
  
  const infoValue = {
    fontSize: '14px',
    color: 'var(--foreground)',
    margin: '0',
    lineHeight: '1.5',
  };