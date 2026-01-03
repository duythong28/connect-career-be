import {
    Body,
    Button,
    Container,
    Head,
    Html,
    Preview,
    Section,
    Text,
  } from '@react-email/components';
  
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
      <Preview>
        Reset your password for ConnectCareer account
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={paragraphTitle}>
            [CONNECTCAREER] ĐẶT LẠI MẬT KHẨU
          </Text>
  
          <Text style={paragraph}>Xin chào {userFirstname},</Text>
          <Text style={paragraph}>
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. 
            Vui lòng nhấn vào nút bên dưới để đặt lại mật khẩu.
          </Text>
          <Section style={btnContainer}>
            <Button style={button} href={url}>
              Đặt lại mật khẩu
            </Button>
          </Section>
          <Text style={paragraph}>
            Liên kết này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, 
            vui lòng bỏ qua email này.
          </Text>
          <Text style={paragraph}>
            <strong style={{ color: '#47699d' }}>CONNECTCAREER</strong> xin cảm ơn bạn đã sử dụng dịch vụ
          </Text>
          <Text style={footer}>
            Trân trọng, <br />
            <strong style={{ color: '#47699d' }}>Admin CONNECTCAREER</strong>
          </Text>
        </Container>
      </Body>
    </Html>
  );
  
  PasswordResetEmail.PreviewProps = {
    userFirstname: 'Alan',
  } as PasswordResetEmailProps;
  
  export default PasswordResetEmail;
  
  const main = {
    backgroundColor: '#ffffff',
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  };
  
  const container = {
    margin: '0 auto',
    padding: '20px 0 48px',
  };
  
  const paragraph = {
    fontSize: '16px',
    lineHeight: '26px',
  };
  
  const paragraphTitle = {
    fontSize: '16px',
    lineHeight: '26px',
    fontWeight: 'bold' as const,
  };
  
  const btnContainer = {
    textAlign: 'center' as const,
  };
  
  const button = {
    backgroundColor: '#f8a600',
    borderRadius: '3px',
    color: '#fff',
    fontSize: '16px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    padding: '12px',
  };
  
  const footer = {
    fontSize: '16px',
    lineHeight: '26px',
  };