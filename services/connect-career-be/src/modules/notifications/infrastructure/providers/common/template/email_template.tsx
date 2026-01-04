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
      Welcome to ConnectCareer - The platform to accelerate your career.
    </Preview>
    <Body style={main}>
      <Container style={containerCard}>
        <Heading style={heading}>
          [CONNECTCAREER] WELCOME TO CONNECTCAREER
        </Heading>

        <Text style={paragraph}>Hi {userFirstname},</Text>
        
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
          <strong style={brandHighlight}>ConnectCareer</strong> would like to thank 
          you for registering on our platform. We are excited to help you find your next opportunity.
        </Text>

        <Text style={footer}>
          Best regards, <br />
          <strong style={brandHighlight}>ConnectCareer Admin</strong>
        </Text>
      </Container>
    </Body>
  </Html>
);

WelcomeEmail.PreviewProps = {
  userFirstname: 'Alan',
  url: 'https://connectcareer.work/verify',
} as WelcomeEmailProps;

export default WelcomeEmail;


const main = {
  backgroundColor: '#F8F9FB',
  padding: '64px 0',
};

const containerCard = {
  backgroundColor: '#ffffff',
  border: '1px solid #E2E8F0',
  borderRadius: '24px',
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
  color: '#475569', // text-slate-600
  margin: '16px 0',
};

const brandHighlight = {
  color: '#2563EB', // text-primary (Solid Blue)
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const buttonPrimary = {
  backgroundColor: '#2563EB', // variant="default"
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

const footer = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#64748B',
  marginTop: '32px',
  borderTop: '1px solid #E2E8F0',
  paddingTop: '24px',
};