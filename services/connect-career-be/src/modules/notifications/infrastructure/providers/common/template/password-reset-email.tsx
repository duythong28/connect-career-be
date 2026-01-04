import {
  Heading,
  Text,
  Section,
  Button,
} from '@react-email/components';
import * as React from 'react';
import BaseEmail from './base-email.template';

interface PasswordResetEmailProps {
  userFirstname: string;
  url: string;
}

export const PasswordResetEmail = ({
  userFirstname,
  url = '',
}: PasswordResetEmailProps) => (
  <BaseEmail
    userFirstname={userFirstname}
    preview="Reset your password for your CareerHub account"
  >
    {/* PAGE HEADER: text-2xl font-bold text-foreground centered */}
    <Heading style={pageTitle}>
      [CAREERHUB] PASSWORD RESET
    </Heading>

    <Text style={paragraph}>
      We received a request to reset the password for your account. 
      Please click the button below to choose a new password.
    </Text>

    <Section style={btnContainer}>
      {/* STANDARD PRIMARY ACTION: h-10, rounded-xl, bg-primary */}
      <Button style={buttonPrimary} href={url}>
        Reset Password
      </Button>
    </Section>

    <Text style={paragraph}>
      This link will expire in 1 hour. If you did not request a password reset, 
      please ignore this email.
    </Text>

    <Text style={paragraph}>
      Thank you for using <strong style={brandHighlight}>CAREERHUB</strong>.
    </Text>

    <Section style={footerContainer}>
      <Text style={footerText}>
        Regards, <br />
        <strong style={brandHighlight}>CareerHub Admin Team</strong>
      </Text>
    </Section>
  </BaseEmail>
);

PasswordResetEmail.PreviewProps = {
  userFirstname: 'Alan',
  url: 'https://careerhub.work/reset-password',
} as PasswordResetEmailProps;

export default PasswordResetEmail;

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
  lineHeight: '1.6',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
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
  padding: '0 32px',
};

const brandHighlight = {
  color: 'var(--primary)',
};

const footerContainer = {
  marginTop: '32px',
  paddingTop: '24px',
  borderTop: '1px solid var(--border)',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '14px',
  color: 'var(--muted-foreground)',
  lineHeight: '24px',
  margin: '0',
};