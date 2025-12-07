import { HttpException, HttpStatus } from '@nestjs/common';

export class IdentityException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
  }
}

export class AuthenticationException extends IdentityException {
  constructor(message: string = 'Authentication failed') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class AuthorizationException extends IdentityException {
  constructor(message: string = 'Access denied') {
    super(message, HttpStatus.FORBIDDEN);
  }
}

export class UserNotFoundException extends IdentityException {
  constructor(identifier?: string) {
    const message = identifier
      ? `User with identifier '${identifier}' not found`
      : 'User not found';
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class UserAlreadyExistsException extends IdentityException {
  constructor(identifier: string) {
    super(
      `User with identifier '${identifier}' already exists`,
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidCredentialsException extends AuthenticationException {
  constructor() {
    super('Invalid credentials provided');
  }
}

export class AccountLockedException extends AuthenticationException {
  constructor(unlockTime?: Date) {
    const message = unlockTime
      ? `Account is locked until ${unlockTime.toISOString()}`
      : 'Account is temporarily locked';
    super(message);
  }
}

export class MfaRequiredException extends AuthenticationException {
  constructor() {
    super('Multi-factor authentication is required');
  }
}

export class InvalidMfaCodeException extends AuthenticationException {
  constructor() {
    super('Invalid MFA code provided');
  }
}

export class TokenExpiredException extends AuthenticationException {
  constructor(tokenType: string = 'Token') {
    super(`${tokenType} has expired`);
  }
}

export class InvalidTokenException extends AuthenticationException {
  constructor(tokenType: string = 'Token') {
    super(`Invalid ${tokenType} provided`);
  }
}

export class RoleNotFoundException extends IdentityException {
  constructor(roleId: string) {
    super(`Role with ID '${roleId}' not found`, HttpStatus.NOT_FOUND);
  }
}

export class PermissionNotFoundException extends IdentityException {
  constructor(permissionId: string) {
    super(
      `Permission with ID '${permissionId}' not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class SystemRoleModificationException extends AuthorizationException {
  constructor() {
    super('Cannot modify system roles');
  }
}

export class SystemPermissionModificationException extends AuthorizationException {
  constructor() {
    super('Cannot modify system permissions');
  }
}

export class InsufficientPermissionsException extends AuthorizationException {
  constructor(requiredPermission?: string) {
    const message = requiredPermission
      ? `Insufficient permissions. Required: ${requiredPermission}`
      : 'Insufficient permissions';
    super(message);
  }
}

export class EmailNotVerifiedException extends AuthenticationException {
  constructor() {
    super('Email address must be verified before login');
  }
}

export class WeakPasswordException extends IdentityException {
  constructor(requirements: string[]) {
    const message = `Password does not meet requirements: ${requirements.join(', ')}`;
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class SessionExpiredException extends AuthenticationException {
  constructor() {
    super('Session has expired');
  }
}

export class TooManyRequestsException extends IdentityException {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Too many requests. Try again in ${retryAfter} seconds`
      : 'Too many requests';
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
