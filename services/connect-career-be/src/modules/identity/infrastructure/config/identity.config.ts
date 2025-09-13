import { registerAs } from '@nestjs/config';

export interface IdentityConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    issuer: string;
    audience: string;
  };
  oauth: {
    google: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
    github: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
  };
  mfa: {
    issuer: string;
    window: number;
    backupCodesCount: number;
  };
  security: {
    bcryptRounds: number;
    maxLoginAttempts: number;
    lockoutDuration: number; // in minutes
    sessionTimeout: number; // in minutes
    passwordResetExpiry: number; // in minutes
    emailVerificationExpiry: number; // in minutes
  };
  frontend: {
    baseUrl: string;
    loginSuccessUrl: string;
    loginFailureUrl: string;
  };
}

export default registerAs('identity', (): IdentityConfig => ({
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'connect-career-api',
    audience: process.env.JWT_AUDIENCE || 'connect-career-app',
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/auth/github/callback',
    },
  },
  mfa: {
    issuer: process.env.MFA_ISSUER || 'Connect Career',
    window: parseInt(process.env.MFA_WINDOW || '1', 10),
    backupCodesCount: parseInt(process.env.MFA_BACKUP_CODES_COUNT || '8', 10),
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '30', 10),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '1440', 10), // 24 hours
    passwordResetExpiry: parseInt(process.env.PASSWORD_RESET_EXPIRY || '60', 10), // 1 hour
    emailVerificationExpiry: parseInt(process.env.EMAIL_VERIFICATION_EXPIRY || '1440', 10), // 24 hours
  },
  frontend: {
    baseUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    loginSuccessUrl: process.env.FRONTEND_LOGIN_SUCCESS_URL || '/dashboard',
    loginFailureUrl: process.env.FRONTEND_LOGIN_FAILURE_URL || '/login?error=oauth_failed',
  },
}));
