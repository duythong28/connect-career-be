import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AuthorizationService,
  PermissionCheck,
} from '../../core/services/authorization.service';
import { PERMISSIONS_KEY } from '../decorators';
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionCheck[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has any of the required permissions
    for (const permission of requiredPermissions) {
      const hasPermission = await this.authorizationService.checkPermission(
        user.sub,
        permission,
      );
      if (hasPermission) {
        return true;
      }
    }

    throw new ForbiddenException('Access denied. Insufficient permissions');
  }
}
