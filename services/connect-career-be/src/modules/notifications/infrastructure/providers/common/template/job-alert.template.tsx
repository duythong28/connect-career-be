import {
  Body,
  Container,
  Column,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
  Button,
} from '@react-email/components';
import * as React from 'react';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  logoUrl?: string;
  salary?: string;
  jobType?: string;
  seniorityLevel?: string;
  jobUrl?: string;
  postedDate?: string;
}

interface JobAlertEmailProps {
  userFirstname: string;
  jobTitle?: string;
  locationName?: string;
  jobs: Job[];
  viewAllJobsUrl?: string;
}

const formatLabel = (str?: string) => {
  if (!str) return '';
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const JobAlertEmail = ({
  userFirstname = 'there',
  jobTitle = 'matching jobs',
  locationName = 'your area',
  jobs = [],
  viewAllJobsUrl = '#',
}: JobAlertEmailProps) => (
  <Html>
    <Head />
    <Preview>
      {jobs.length.toString()} new jobs found on CareerHub
    </Preview>
    <Body style={main}>
      <Container style={mainContainer}>
        {/* Header Section */}
        <Section style={header}>
          <Text style={logoText}>
            <span style={logoPrimary}>CAREER</span>
            <span style={logoSecondary}>HUB</span>
          </Text>
        </Section>

        {/* Intro Section */}
        <Section style={contentPadding}>
          <Text style={greeting}>Hi {userFirstname},</Text>
          <Heading style={pageTitle}>
            {jobs.length} new jobs matching your profile
          </Heading>
          <Text style={subheading}>
            New positions in {locationName} are ready for you to explore.
          </Text>
        </Section>

        {/* Job List - Cards use bg-card and border-border to pop */}
        <Section style={listSection}>
          {jobs.map((job) => (
            <Section key={job.id} style={jobCard}>
              <Row style={jobRow}>
                <Column style={{ width: '60px' }} align="left" valign="top">
                  {job.logoUrl ? (
                    <Img
                      src={job.logoUrl}
                      width="48"
                      height="48"
                      alt={job.company}
                      style={companyLogo}
                    />
                  ) : (
                    <Section style={logoPlaceholder}>
                      <Text style={logoPlaceholderText}>
                        {job.company.charAt(0).toUpperCase()}
                      </Text>
                    </Section>
                  )}
                </Column>
                <Column valign="top">
                  <Link href={job.jobUrl || '#'} style={jobLinkTitle}>
                    {job.title}
                  </Link>
                  <Text style={companyInfo}>{job.company}</Text>
                  
                  <Row style={metadataRow}>
                    <Column>
                      <Text style={locationInfo}>📍 {job.location}</Text>
                    </Column>
                  </Row>

                  <Row style={tagsRow}>
                    {job.salary && (
                      <Column style={tagColumn}>
                        <Text style={tagItem}>💰 {job.salary}</Text>
                      </Column>
                    )}
                    {job.jobType && (
                      <Column style={tagColumn}>
                        <Text style={tagItem}>📋 {formatLabel(job.jobType)}</Text>
                      </Column>
                    )}
                  </Row>

                  <Row style={{ marginTop: '12px' }}>
                    <Column align="left" valign="middle">
                      {job.postedDate && (
                        <Text style={postedDateText}>{job.postedDate}</Text>
                      )}
                    </Column>
                    <Column align="right" valign="middle">
                      <Button style={applyButton} href={job.jobUrl || '#'}>
                        View Details
                      </Button>
                    </Column>
                  </Row>
                </Column>
              </Row>
            </Section>
          ))}
        </Section>

        {/* Footer Section */}
        <Section style={footerSection}>
          <Button style={viewAllButton} href={viewAllJobsUrl}>
            View All Jobs
          </Button>
          <Text style={footerText}>
            © 2026 CareerHub. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

/* --- CareerHub Design System Styles --- */

const main = {
  backgroundColor: '#F8F9FB', // bg-[#F8F9FB]
  padding: '40px 0',
};

const mainContainer = {
  margin: '0 auto',
  maxWidth: '540px',
};

const header = {
  padding: '0 24px 16px',
};

const logoText = {
  fontSize: '18px',
  margin: '0',
  letterSpacing: '-0.5px',
};

const logoPrimary = {
  fontWeight: '900' as const,
  color: '#0F172A', // text-foreground
};

const logoSecondary = {
  fontWeight: '500' as const,
  color: '#2563EB', // text-primary
  marginLeft: '2px',
};

const contentPadding = {
  padding: '0 24px 24px',
};

const greeting = {
  fontSize: '14px',
  color: '#64748B', // text-muted-foreground
  margin: '0 0 4px 0',
};

const pageTitle = {
  fontSize: '24px', // text-2xl
  fontWeight: '700' as const, // font-bold
  color: '#0F172A', // text-foreground
  lineHeight: '32px',
  margin: '0 0 8px 0',
};

const subheading = {
  fontSize: '14px',
  color: '#475569',
  lineHeight: '1.5',
  margin: '0',
};

const listSection = {
  padding: '0 16px',
};

const jobCard = {
  backgroundColor: '#ffffff', // bg-card
  borderRadius: '24px', // rounded-3xl (Main container feel for items)
  border: '1px solid #E2E8F0', // border-border
  marginBottom: '12px',
};

const jobRow = {
  padding: '20px',
};

const companyLogo = {
  borderRadius: '12px', // rounded-xl
  border: '1px solid #E2E8F0',
};

const logoPlaceholder = {
  width: '48px',
  height: '48px',
  backgroundColor: '#F8F9FB',
  borderRadius: '12px',
  display: 'table-cell',
  verticalAlign: 'middle',
  textAlign: 'center' as const,
};

const logoPlaceholderText = {
  fontSize: '20px',
  fontWeight: '700' as const,
  color: '#94A3B8',
  margin: '0',
};

const jobLinkTitle = {
  fontSize: '17px',
  fontWeight: '700' as const,
  color: '#0F172A',
  textDecoration: 'none',
};

const companyInfo = {
  fontSize: '14px',
  color: '#2563EB', // text-primary
  fontWeight: '600' as const,
  margin: '2px 0 4px',
};

const locationInfo = {
  fontSize: '12px', // text-xs
  color: '#64748B',
  margin: '0',
};

const metadataRow = {
  marginTop: '2px',
};

const tagsRow = {
  marginTop: '8px',
};

const tagColumn = {
  width: 'auto',
  paddingRight: '8px',
};

const tagItem = {
  fontSize: '11px', // text-xs compact
  fontWeight: '600' as const,
  color: '#475569',
  margin: '0',
  backgroundColor: '#F1F5F9',
  padding: '4px 8px',
  borderRadius: '8px',
};

const postedDateText = {
  fontSize: '12px', // text-xs
  color: '#94A3B8',
  margin: '0',
};

const applyButton = {
  backgroundColor: '#2563EB', // bg-primary (Solid Blue)
  borderRadius: '12px', // rounded-xl
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  height: '36px', // h-9
  lineHeight: '36px',
  padding: '0 16px',
};

const footerSection = {
  padding: '32px 24px',
  textAlign: 'center' as const,
};

const viewAllButton = {
  backgroundColor: '#0F172A', // text-foreground for contrast secondary-primary action
  borderRadius: '12px', // rounded-xl
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  height: '40px', // h-10
  lineHeight: '40px',
  padding: '0 24px',
  marginBottom: '20px',
};

const footerText = {
  fontSize: '11px',
  color: '#94A3B8',
  margin: '0',
};

// Preview Data
JobAlertEmail.PreviewProps = {
  userFirstname: 'Toàn',
  locationName: 'Ho Chi Minh City',
  jobs: [
    {
      id: '1',
      title: 'JavaScript Intern',
      company: 'Google',
      location: 'Ho Chi Minh',
      logoUrl: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png',
      salary: '$500 - $800',
      jobType: 'full_time',
      postedDate: '1 week ago',
    },
    {
      id: '2',
      title: 'Technical Program Management',
      company: 'Microsoft',
      location: 'Rajasthan, India',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/2048px-Microsoft_logo.svg.png',
      jobType: 'full_time',
      postedDate: '3 months ago',
    },
  ],
} as JobAlertEmailProps;

export default JobAlertEmail;