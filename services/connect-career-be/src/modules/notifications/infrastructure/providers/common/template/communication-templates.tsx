import {
    Heading,
    Text,
    Section,
    Button,
  } from '@react-email/components';
  import * as React from 'react';
  import BaseEmail from './base-email.template';
  
  // New Message
  interface NewMessageProps {
    userFirstname: string;
    senderName: string;
    messagePreview?: string;
    conversationUrl?: string;
  }
  
  export const NewMessageEmail = ({
    userFirstname,
    senderName,
    messagePreview,
    conversationUrl = '#',
  }: NewMessageProps) => (
    <BaseEmail
      userFirstname={userFirstname}
      preview={`New message from ${senderName}`}
    >
      <Heading style={pageTitle}>New Message</Heading>
      <Text style={paragraph}>
        You have a new message from <strong>{senderName}</strong>.
      </Text>
      {messagePreview && (
        <Section style={messageBox}>
          <Text style={messagePreviewText}>"{messagePreview}"</Text>
        </Section>
      )}
      <Section style={btnContainer}>
        <Button style={buttonPrimary} href={conversationUrl}>
          View Message
        </Button>
      </Section>
    </BaseEmail>
  );
  
  // Mention
  interface MentionProps {
    userFirstname: string;
    mentionedBy: string;
    context?: string;
    mentionUrl?: string;
  }
  
  export const MentionEmail = ({
    userFirstname,
    mentionedBy,
    context,
    mentionUrl = '#',
  }: MentionProps) => (
    <BaseEmail
      userFirstname={userFirstname}
      preview={`${mentionedBy} mentioned you`}
    >
      <Heading style={pageTitle}>You've Been Mentioned</Heading>
      <Text style={paragraph}>
        <strong>{mentionedBy}</strong> mentioned you in a conversation.
      </Text>
      {context && (
        <Section style={contextBox}>
          <Text style={contextText}>{context}</Text>
        </Section>
      )}
      <Section style={btnContainer}>
        <Button style={buttonPrimary} href={mentionUrl}>
          View Conversation
        </Button>
      </Section>
    </BaseEmail>
  );
  
  // Shared Styles
  const pageTitle = {
    fontSize: '24px',
    fontWeight: '700' as const,
    color: '#0F172A',
    lineHeight: '32px',
    margin: '0 0 16px 0',
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
  
  const messageBox = {
    backgroundColor: '#F8F9FB',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '16px',
    margin: '16px 0',
    borderLeft: '4px solid #2563EB',
  };
  
  const messagePreviewText = {
    fontSize: '14px',
    color: '#475569',
    margin: '0',
    lineHeight: '1.5',
    fontStyle: 'italic' as const,
  };
  
  const contextBox = {
    backgroundColor: '#F1F5F9',
    borderRadius: '8px',
    padding: '12px',
    margin: '16px 0',
  };
  
  const contextText = {
    fontSize: '14px',
    color: '#64748B',
    margin: '0',
    lineHeight: '1.5',
  };