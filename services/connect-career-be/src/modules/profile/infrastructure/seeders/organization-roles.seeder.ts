export const DEFAULT_ORGANIZATION_ROLES = [
  {
    name: 'owner',
    description: 'Organization owner with full access',
    isSystemRole: true,
    permissions: [
      'manage:organization',
      'manage:members',
      'manage:jobs',
      'manage:applications',
      'manage:reports',
      'manage:settings',
    ],
  },
  {
    name: 'admin',
    description: 'Organization administrator',
    isSystemRole: true,
    permissions: [
      'manage:jobs',
      'manage:applications',
      'manage:members',
      'read:reports',
      'read:settings',
    ],
  },
  {
    name: 'hr_manager',
    description: 'HR Manager with hiring responsibilities',
    isSystemRole: false,
    permissions: [
      'manage:jobs',
      'read:applications',
      'update:applications',
      'read:reports',
    ],
  },
  {
    name: 'recruiter',
    description: 'Recruiter with limited access',
    isSystemRole: false,
    permissions: [
      'create:jobs',
      'read:jobs',
      'read:applications',
      'update:applications',
    ],
  },
  {
    name: 'viewer',
    description: 'Read-only access to organization data',
    isSystemRole: false,
    permissions: ['read:jobs', 'read:applications', 'read:reports'],
  },
];
