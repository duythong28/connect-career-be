import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';
import { UserNotificationPreferences } from '../../domain/entities/user-notification-preferences.entity';

export class UpdatePreferencesDto {
  @ApiProperty()
  @IsObject()
  @IsOptional()
  preferences?: Partial<UserNotificationPreferences['preferences']>;
}