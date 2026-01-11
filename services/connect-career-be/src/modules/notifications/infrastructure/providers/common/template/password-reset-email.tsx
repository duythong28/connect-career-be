import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface PasswordResetEmailProps {
  userFirstname: string;
  url: string;
}

export const PasswordResetEmail = ({
  userFirstname,
  url = '',
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your password for your CareerHub account</Preview>
    <Body style={main}>
      <Container style={containerCard}>
        {/* PAGE HEADER: 24px, Bold, Foreground Color, Centered */}
        <Heading style={heading}>
          [CAREERHUB] PASSWORD RESET
        </Heading>

        <Text style={paragraph}>
          We received a request to reset the password for your account. 
          Please click the button below to choose a new password.
        </Text>

        <Section style={btnContainer}>
          {/* STANDARD PRIMARY ACTION: h-10 (40px), rounded-xl (12px), bg-primary */}
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

        <Section style={footerSection}>
          <Text style={footerText}>
            Regards, <br />
            <strong style={brandHighlight}>CareerHub Admin Team</strong>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

PasswordResetEmail.PreviewProps = {
  userFirstname: 'Alan',
  url: 'https://careerhub.work/reset-password',
} as PasswordResetEmailProps;

export default PasswordResetEmail;

// --- CareerHub Design System Styles (Hardcoded for Email Compatibility) ---

const main = {
  backgroundColor: '#F8F9FB', // bg-[#F8F9FB]
  padding: '64px 0',
};

const containerCard = {
  backgroundColor: '#ffffff', // bg-card
  border: '1px solid #E2E8F0', // border-border
  borderRadius: '24px', // rounded-3xl
  margin: '0 auto',
  padding: '40px',
  width: '560px',
};

const heading = {
  fontSize: '24px', // text-2xl
  fontWeight: '700', // font-bold
  color: '#0F172A', // text-foreground
  lineHeight: '32px',
  textAlign: 'center' as const,
  margin: '0 0 24px 0',
  textTransform: 'uppercase' as const,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#475569', // text-muted-foreground / slate-600
  margin: '16px 0',
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const buttonPrimary = {
  backgroundColor: '#2563EB', // bg-primary (CareerHub Blue)
  borderRadius: '12px', // rounded-xl
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  height: '40px', // h-10
  lineHeight: '40px',
  padding: '0 32px',
};

const brandHighlight = {
  color: '#2563EB', // text-primary
};

const footerSection = {
  marginTop: '32px',
  borderTop: '1px solid #E2E8F0', // border-border
  paddingTop: '24px',
};

const footerText = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#64748B', // text-muted-foreground
  margin: '0',
};