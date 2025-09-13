import { Injectable } from '@nestjs/common';
import { WeakPasswordException } from '../exceptions/identity.exceptions';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number; // 0-100
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minSpecialChars: number;
  forbidCommonPasswords: boolean;
  forbidPersonalInfo: boolean;
}

@Injectable()
export class PasswordValidator {
  private readonly defaultPolicy: PasswordPolicy = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    minSpecialChars: 1,
    forbidCommonPasswords: true,
    forbidPersonalInfo: true,
  };

  private readonly commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey',
    'dragon', 'master', 'shadow', 'superman', 'michael',
    'football', 'baseball', 'liverpool', 'jordan', 'harley'
  ];

  private readonly specialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

  validate(password: string, policy?: Partial<PasswordPolicy>, userInfo?: { email?: string; firstName?: string; lastName?: string }): PasswordValidationResult {
    const activePolicy = { ...this.defaultPolicy, ...policy };
    const errors: string[] = [];
    let score = 0;

    // Length validation
    if (password.length < activePolicy.minLength) {
      errors.push(`Password must be at least ${activePolicy.minLength} characters long`);
    } else {
      score += Math.min(25, (password.length / activePolicy.minLength) * 25);
    }

    if (password.length > activePolicy.maxLength) {
      errors.push(`Password must not exceed ${activePolicy.maxLength} characters`);
    }

    // Character type validation
    if (activePolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (/[A-Z]/.test(password)) {
      score += 15;
    }

    if (activePolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (/[a-z]/.test(password)) {
      score += 15;
    }

    if (activePolicy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else if (/\d/.test(password)) {
      score += 15;
    }

    if (activePolicy.requireSpecialChars) {
      const specialCharCount = (password.match(this.specialChars) || []).length;
      if (specialCharCount < activePolicy.minSpecialChars) {
        errors.push(`Password must contain at least ${activePolicy.minSpecialChars} special character(s)`);
      } else {
        score += Math.min(20, specialCharCount * 5);
      }
    }

    // Common password check
    if (activePolicy.forbidCommonPasswords) {
      const lowerPassword = password.toLowerCase();
      if (this.commonPasswords.some(common => lowerPassword.includes(common))) {
        errors.push('Password contains common words or patterns');
        score -= 20;
      }
    }

    // Personal information check
    if (activePolicy.forbidPersonalInfo && userInfo) {
      const personalInfo = [
        userInfo.email?.split('@')[0],
        userInfo.firstName,
        userInfo.lastName
      ].filter(Boolean).map(info => info!.toLowerCase());

      const lowerPassword = password.toLowerCase();
      for (const info of personalInfo) {
        if (lowerPassword.includes(info)) {
          errors.push('Password should not contain personal information');
          score -= 15;
          break;
        }
      }
    }

    // Additional complexity checks
    if (password.length >= 12) score += 10;
    if (/[A-Z].*[A-Z]/.test(password)) score += 5; // Multiple uppercase
    if (/\d.*\d/.test(password)) score += 5; // Multiple numbers
    if ((password.match(this.specialChars) || []).length >= 2) score += 10; // Multiple special chars

    // Repetition penalty
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password should not contain repeated characters');
      score -= 10;
    }

    // Sequential characters penalty
    if (this.hasSequentialChars(password)) {
      errors.push('Password should not contain sequential characters');
      score -= 10;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      isValid: errors.length === 0,
      errors,
      score
    };
  }

  validateAndThrow(password: string, policy?: Partial<PasswordPolicy>, userInfo?: { email?: string; firstName?: string; lastName?: string }): void {
    const result = this.validate(password, policy, userInfo);
    if (!result.isValid) {
      throw new WeakPasswordException(result.errors);
    }
  }

  getPasswordStrengthLabel(score: number): string {
    if (score >= 80) return 'Very Strong';
    if (score >= 60) return 'Strong';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Weak';
    return 'Very Weak';
  }

  private hasSequentialChars(password: string): boolean {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      '0123456789',
      'qwertyuiopasdfghjklzxcvbnm'
    ];

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const subseq = sequence.substring(i, i + 3);
        if (password.toLowerCase().includes(subseq) || 
            password.toLowerCase().includes(subseq.split('').reverse().join(''))) {
          return true;
        }
      }
    }

    return false;
  }
}
