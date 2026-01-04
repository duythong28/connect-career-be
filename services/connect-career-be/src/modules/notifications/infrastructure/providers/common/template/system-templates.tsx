import {
    Heading,
    Text,
    Section,
    Button,
  } from '@react-email/components';
  import * as React from 'react';
  import BaseEmail from './base-email.template';
  
  // --- Email Verified ---
  interface EmailVerifiedProps {
    userFirstname: string;
    profileUrl?: string;
  }
  
  export const EmailVerifiedEmail = ({
    userFirstname,
    profileUrl = '#',
  }: EmailVerifiedProps) => (
    <BaseEmail
      userFirstname={userFirstname}
      preview="Your email has been verified"
    >
      <Heading style={pageTitle}>✅ Email Verified</Heading>
      
      <Text style={paragraph}>
        Congratulations! Your email address has been successfully verified.
      </Text>
      
      <Text style={paragraph}>
        Your account is now fully activated. You can start exploring job opportunities and building your career profile.
      </Text>
      
      <Section style={btnContainer}>
        <Button style={buttonPrimary} href={profileUrl}>
          Complete Your Profile
        </Button>
      </Section>
    </BaseEmail>
  );
  
  // --- CareerHub Design System Styles ---
  
  const pageTitle = {
    fontSize: '24px', // text-2xl
    fontWeight: '700' as const,
    color: 'var(--foreground)',
    lineHeight: '32px',
    margin: '0 0 16px 0',
    textAlign: 'center' as const, // Auth cards must be text-center
  };
  
  const paragraph = {
    fontSize: '14px',
    color: 'var(--muted-foreground)',
    lineHeight: '1.5',
    margin: '0 0 16px 0',
    textAlign: 'center' as const, // Centered description for auth/confirmation
  };
  
  const btnContainer = {
    textAlign: 'center' as const,
    margin: '24px 0',
  };
  
  const buttonPrimary = {
    backgroundColor: 'var(--primary)',
    borderRadius: '12px', // rounded-xl
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