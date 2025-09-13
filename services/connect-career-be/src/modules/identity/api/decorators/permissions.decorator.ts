import { SetMetadata } from '@nestjs/common';
import { PermissionCheck } from '../../core/services/authorization.service';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: PermissionCheck[]) => SetMetadata(PERMISSIONS_KEY, permissions);
