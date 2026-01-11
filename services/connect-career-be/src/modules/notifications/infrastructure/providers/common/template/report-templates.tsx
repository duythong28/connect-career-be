import {
  Heading,
  Text,
  Section,
  Button,
} from '@react-email/components';
import * as React from 'react';
import BaseEmail from './base-email.template';

// --- Report Created ---
interface ReportCreatedProps {
  userFirstname: string;
  reportType: string;
  reportId: string;
  reportUrl?: string;
}

export const ReportCreatedEmail = ({
  userFirstname,
  reportType,
  reportId,
  reportUrl = '#',
}: ReportCreatedProps) => (
  <BaseEmail
    userFirstname={userFirstname}
    preview={`Your ${reportType} report has been created`}
  >
    <Heading style={pageTitle}>Report Created</Heading>
    <Text style={paragraph}>
      Your {reportType} report has been successfully created and submitted.
    </Text>
    <Section style={infoCard}>
      <Text style={labelTitle}>Report ID</Text>
      <Text style={infoValue}>{reportId}</Text>
    </Section>
    <Text style={paragraph}>
      Our team will review your report and take appropriate action. You'll be notified of any updates.
    </Text>
    <Section style={btnContainer}>
      <Button style={buttonPrimary} href={reportUrl}>
        View Report
      </Button>
    </Section>
  </BaseEmail>
);

// --- Report Status Changed ---
interface ReportStatusChangedProps {
  userFirstname: string;
  reportType: string;
  status: string;
  reportUrl?: string;
}

export const ReportStatusChangedEmail = ({
  userFirstname,
  reportType,
  status,
  reportUrl = '#',
}: ReportStatusChangedProps) => (
  <BaseEmail
    userFirstname={userFirstname}
    preview={`Your ${reportType} report status has been updated`}
  >
    <Heading style={pageTitle}>Report Status Updated</Heading>
    <Text style={paragraph}>
      The status of your {reportType} report has been updated.
    </Text>
    <Section style={statusCard}>
      <Text style={labelTitle}>Current Status</Text>
      <Text style={statusText}>{status}</Text>
    </Section>
    <Section style={btnContainer}>
      <Button style={buttonPrimary} href={reportUrl}>
        View Report
      </Button>
    </Section>
  </BaseEmail>
);

// --- Report Assigned ---
interface ReportAssignedProps {
  userFirstname: string;
  reportType: string;
  assignedTo?: string;
  reportUrl?: string;
}

export const ReportAssignedEmail = ({
  userFirstname,
  reportType,
  assignedTo,
  reportUrl = '#',
}: ReportAssignedProps) => (
  <BaseEmail
    userFirstname={userFirstname}
    preview={`A ${reportType} report has been assigned to you`}
  >
    <Heading style={pageTitle}>Report Assigned</Heading>
    <Text style={paragraph}>
      A {reportType} report has been assigned to you{assignedTo ? ` by ${assignedTo}` : ''}.
    </Text>
    <Text style={paragraph}>
      Please review the report details and take appropriate action.
    </Text>
    <Section style={btnContainer}>
      <Button style={buttonPrimary} href={reportUrl}>
        Review Report
      </Button>
    </Section>
  </BaseEmail>
);

// --- Report Resolved ---
interface ReportResolvedProps {
  userFirstname: string;
  reportType: string;
  resolution?: string;
  reportUrl?: string;
}

export const ReportResolvedEmail = ({
  userFirstname,
  reportType,
  resolution,
  reportUrl = '#',
}: ReportResolvedProps) => (
  <BaseEmail
    userFirstname={userFirstname}
    preview={`Your ${reportType} report has been resolved`}
  >
    <Heading style={pageTitle}>Report Resolved</Heading>
    <Text style={paragraph}>
      Your {reportType} report has been resolved.
    </Text>
    {resolution && (
      <Section style={infoCard}>
        <Text style={labelTitle}>Resolution Details</Text>
        <Text style={infoValue}>{resolution}</Text>
      </Section>
    )}
    <Section style={btnContainer}>
      <Button style={buttonPrimary} href={reportUrl}>
        View Resolution
      </Button>
    </Section>
  </BaseEmail>
);

// --- Report Dismissed ---
interface ReportDismissedProps {
  userFirstname: string;
  reportType: string;
  reason?: string;
  reportUrl?: string;
}

export const ReportDismissedEmail = ({
  userFirstname,
  reportType,
  reason,
  reportUrl = '#',
}: ReportDismissedProps) => (
  <BaseEmail
    userFirstname={userFirstname}
    preview={`Your ${reportType} report has been dismissed`}
  >
    <Heading style={pageTitle}>Report Dismissed</Heading>
    <Text style={paragraph}>
      Your {reportType} report has been reviewed and dismissed.
    </Text>
    {reason && (
      <Section style={infoCard}>
        <Text style={labelTitle}>Reason for Dismissal</Text>
        <Text style={infoValue}>{reason}</Text>
      </Section>
    )}
    <Section style={btnContainer}>
      <Button style={buttonSecondary} href={reportUrl}>
        View Report
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

const statusCard = {
  backgroundColor: '#F8F9FB',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
};

const statusText = {
  fontSize: '16px',
  fontWeight: '700' as const,
  color: '#2563EB',
  margin: '0',
};