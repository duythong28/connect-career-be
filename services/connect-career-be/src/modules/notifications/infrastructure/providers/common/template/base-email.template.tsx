import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface BaseEmailProps {
  userFirstname?: string;
  preview?: string;
  children: React.ReactNode;
  footerText?: string;
}

export const BaseEmail = ({
  userFirstname = 'there',
  preview = 'Notification from CareerHub',
  children,
  footerText = '© 2026 CareerHub. All rights reserved.',
}: BaseEmailProps) => (
  <Html>
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={mainContainer}>
        {/* Header Section */}
        <Section style={header}>
          <Text style={logoText}>
            <span style={logoPrimary}>CAREER</span>
            <span style={logoSecondary}>HUB</span>
          </Text>
        </Section>

        {/* Content Section */}
        <Section style={contentPadding}>
          {userFirstname && (
            <Text style={greeting}>Hi {userFirstname},</Text>
          )}
          {children}
        </Section>

        {/* Footer Section */}
        <Section style={footerSection}>
          <Text style={footerTextStyle}>{footerText}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

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

const greeting = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: '#64748B',
  margin: '0 0 12px 0',
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

export default BaseEmail;