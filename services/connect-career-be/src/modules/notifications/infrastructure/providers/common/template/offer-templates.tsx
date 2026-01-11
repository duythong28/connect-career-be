import {
  Heading,
  Text,
  Section,
  Button,
} from '@react-email/components';
import * as React from 'react';
import BaseEmail from './base-email.template';

// --- Offer Sent ---
interface OfferSentProps {
  userFirstname: string;
  jobTitle: string;
  companyName: string;
  offerDetails?: string;
  offerUrl?: string;
  deadline?: string;
}

export const OfferSentEmail = ({
  userFirstname,
  jobTitle,
  companyName,
  offerDetails,
  offerUrl = '#',
  deadline,
}: OfferSentProps) => (
  <BaseEmail
    userFirstname={userFirstname}
    preview={`Job offer for ${jobTitle} at ${companyName}`}
  >
    <Heading style={pageTitle}>🎉 Job Offer Received!</Heading>
    <Text style={paragraph}>
      Congratulations! You've received a job offer for <strong>{jobTitle}</strong> at <strong>{companyName}</strong>.
    </Text>
    
    {offerDetails && (
      <Section style={infoCard}>
        <Text style={labelTitle}>Offer Details</Text>
        <Text style={infoValue}>{offerDetails}</Text>
      </Section>
    )}
    
    {deadline && (
      <Section style={highlightCard}>
        <Text style={labelTitle}>Response Deadline</Text>
        <Text style={highlightValue}>{deadline}</Text>
      </Section>
    )}
    
    <Text style={paragraph}>
      Please review the offer details and respond by the deadline. We're excited about the possibility of you joining our team!
    </Text>
    
    <Section style={btnContainer}>
      <Button style={buttonPrimary} href={offerUrl}>
        View Offer Details
      </Button>
    </Section>
  </BaseEmail>
);

// --- Offer Accepted ---
interface OfferAcceptedProps {
  userFirstname: string;
  jobTitle: string;
  companyName: string;
  startDate?: string;
  nextStepsUrl?: string;
}

export const OfferAcceptedEmail = ({
  userFirstname,
  jobTitle,
  companyName,
  startDate,
  nextStepsUrl = '#',
}: OfferAcceptedProps) => (
  <BaseEmail
    userFirstname={userFirstname}
    preview={`Offer accepted for ${jobTitle}`}
  >
    <Heading style={pageTitle}>🎊 Offer Accepted!</Heading>
    <Text style={paragraph}>
      We're thrilled that you've accepted the offer for <strong>{jobTitle}</strong> at <strong>{companyName}</strong>!
    </Text>
    
    {startDate && (
      <Section style={infoCard}>
        <Text style={labelTitle}>Start Date</Text>
        <Text style={infoValue}>{startDate}</Text>
      </Section>
    )}
    
    <Text style={paragraph}>
      Welcome to the team! We're looking forward to working with you. You'll receive further information about onboarding and next steps soon.
    </Text>
    
    <Section style={btnContainer}>
      <Button style={buttonPrimary} href={nextStepsUrl}>
        View Next Steps
      </Button>
    </Section>
  </BaseEmail>
);

// --- Offer Rejected ---
interface OfferRejectedProps {
  userFirstname: string;
  jobTitle: string;
  companyName: string;
  browseJobsUrl?: string;
}

export const OfferRejectedEmail = ({
  userFirstname,
  jobTitle,
  companyName,
  browseJobsUrl = '#',
}: OfferRejectedProps) => (
  <BaseEmail
    userFirstname={userFirstname}
    preview={`Update on your offer for ${jobTitle}`}
  >
    <Heading style={pageTitle}>Offer Update</Heading>
    <Text style={paragraph}>
      We've received your decision regarding the offer for <strong>{jobTitle}</strong> at <strong>{companyName}</strong>.
    </Text>
    <Text style={paragraph}>
      We respect your decision and wish you the best in your career journey. If you change your mind or if we have other opportunities that might interest you, please don't hesitate to reach out.
    </Text>
    
    <Section style={btnContainer}>
      <Button style={buttonSecondary} href={browseJobsUrl}>
        Browse Other Opportunities
      </Button>
    </Section>
  </BaseEmail>
);

/* --- CareerHub Design System Styles --- */

const pageTitle = {
  fontSize: '24px',
  fontWeight: '700' as const,
  color: '#0F172A',
  lineHeight: '32px',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '14px',
  color: '#475569',
  lineHeight: '1.5',
  margin: '0 0 16px 0',
};

const labelTitle = {
  fontSize: '12px',
  fontWeight: '700' as const,
  color: '#64748B',
  margin: '0 0 4px 0',
  textTransform: 'uppercase' as const,
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const buttonPrimary = {
  backgroundColor: '#2563EB',
  borderRadius: '12px',
  color: '#ffffff',
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
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  color: '#0F172A',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  height: '40px',
  lineHeight: '40px',
  padding: '0 24px',
};

const infoCard = {
  backgroundColor: '#F8F9FB',
  border: '1px solid #E2E8F0',
  borderRadius: '16px',
  padding: '16px',
  margin: '16px 0',
};

const infoValue = {
  fontSize: '14px',
  color: '#0F172A',
  margin: '0',
  lineHeight: '1.5',
};

const highlightCard = {
  backgroundColor: '#ffffff',
  border: '2px solid #2563EB',
  borderRadius: '16px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
};

const highlightValue = {
  fontSize: '16px',
  fontWeight: '700' as const,
  color: '#2563EB',
  margin: '0',
};