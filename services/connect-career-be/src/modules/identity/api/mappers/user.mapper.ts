import { User } from '../../domain/entities/user.entity';
import { UserProfileDto } from '../dtos/auth.dto';

export class UserMapper {
  static toUserProfileDto(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar || user.avatarUrl,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
    };
  }

  static toUserProfileDtoArray(users: User[]): UserProfileDto[] {
    return users.map(user => this.toUserProfileDto(user));
  }
}