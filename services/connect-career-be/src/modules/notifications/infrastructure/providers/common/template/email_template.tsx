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

interface WelcomeEmailProps {
  userFirstname: string;
  url: string;
}

export const WelcomeEmail = ({
  userFirstname,
  url = '',
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Welcome to CareerHub - The platform to accelerate your career.
    </Preview>
    <Body style={main}>
      <Container style={mainContainer}>
        {/* Logo Header */}
        <Section style={header}>
          <Text style={logoText}>
            <span style={logoPrimary}>CAREER</span>
            <span style={logoSecondary}>HUB</span>
          </Text>
        </Section>

        {/* Content Section */}
        <Section style={contentPadding}>
          <Heading style={pageTitle}>Welcome to CareerHub</Heading>
          
          <Text style={greeting}>Hi {userFirstname},</Text>
          
          <Text style={paragraph}>
            Thank you for joining our community! This is a registration confirmation email. 
            Please click the verification button below to continue setting up your account.
          </Text>

          <Section style={btnContainer}>
            <Button style={buttonPrimary} href={url}>
              Verify Account
            </Button>
          </Section>

          <Text style={paragraph}>
            We are excited to help you find your next opportunity. Our platform is designed to connect you with the best roles matching your profile.
          </Text>
        </Section>

        {/* Footer Section */}
        <Section style={footerSection}>
          <Text style={footerTextStyle}>
            © 2026 CareerHub Admin. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

WelcomeEmail.PreviewProps = {
  userFirstname: 'Alan',
  url: 'https://connect-career.app.vercel/verify',
} as WelcomeEmailProps;

/* --- CareerHub Design System Styles --- */

const main = {
  backgroundColor: '#F8F9FB',
  padding: '40px 0',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const mainContainer = {
  margin: '0 auto',
  maxWidth: '540px',
  backgroundColor: '#ffffff',
  border: '1px solid #E2E8F0',
  borderRadius: '24px',
  overflow: 'hidden' as const,
};

const header = {
  padding: '32px 32px 16px',
};

const logoText = {
  fontSize: '18px',
  margin: '0',
  letterSpacing: '-0.5px',
};

const logoPrimary = {
  fontWeight: '900' as const,
  color: '#0F172A',
};

const logoSecondary = {
  fontWeight: '500' as const,
  color: '#2563EB',
  marginLeft: '2px',
};

const contentPadding = {
  padding: '0 32px 32px',
};

const pageTitle = {
  fontSize: '24px',
  fontWeight: '700' as const,
  color: '#0F172A',
  lineHeight: '32px',
  margin: '0 0 24px 0',
  textAlign: 'center' as const,
};

const greeting = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: '#64748B',
  margin: '0 0 12px 0',
};

const paragraph = {
  fontSize: '14px',
  color: '#475569',
  lineHeight: '1.5',
  margin: '0 0 16px 0',
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

const footerSection = {
  padding: '24px 32px',
  textAlign: 'center' as const,
  borderTop: '1px solid #E2E8F0',
  backgroundColor: '#ffffff',
};

const footerTextStyle = {
  fontSize: '11px',
  color: '#94A3B8',
  margin: '0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

export default WelcomeEmail;