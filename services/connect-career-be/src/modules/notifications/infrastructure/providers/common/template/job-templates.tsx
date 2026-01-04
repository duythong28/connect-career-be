import {
    Heading,
    Text,
    Section,
    Button,
  } from '@react-email/components';
  import * as React from 'react';
  import BaseEmail from './base-email.template';
  
  // --- Job Deadline Approaching ---
  interface JobDeadlineApproachingProps {
    userFirstname: string;
    jobTitle: string;
    companyName: string;
    deadline: string;
    jobUrl?: string;
  }
  
  export const JobDeadlineApproachingEmail = ({
    userFirstname,
    jobTitle,
    companyName,
    deadline,
    jobUrl = '#',
  }: JobDeadlineApproachingProps) => (
    <BaseEmail
      userFirstname={userFirstname}
      preview={`Application deadline for ${jobTitle} is approaching`}
    >
      <Heading style={pageTitle}>⏰ Application Deadline Approaching</Heading>
      
      <Text style={paragraph}>
        The application deadline for <strong>{jobTitle}</strong> at <strong>{companyName}</strong> is approaching soon.
      </Text>
      
      <Section style={deadlineBox}>
        <Text style={labelTitle}>Application Deadline</Text>
        <Text style={deadlineText}>{deadline}</Text>
      </Section>
      
      <Text style={paragraph}>
        Don't miss out on this opportunity! Apply now before the deadline.
      </Text>
      
      <Section style={btnContainer}>
        <Button style={buttonPrimary} href={jobUrl}>
          Apply Now
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
    height: '40px', // Aligning with h-10
    lineHeight: '40px',
    padding: '0 24px',
  };
  
  const deadlineBox = {
    backgroundColor: 'var(--card)', // Popping against page background
    border: '2px solid var(--primary)', // Highlighting urgency
    borderRadius: '16px', // rounded-xl
    padding: '16px',
    margin: '16px 0',
    textAlign: 'center' as const,
  };
  
  const deadlineText = {
    fontSize: '18px',
    fontWeight: '700' as const,
    color: 'var(--foreground)',
    margin: '0',
  };