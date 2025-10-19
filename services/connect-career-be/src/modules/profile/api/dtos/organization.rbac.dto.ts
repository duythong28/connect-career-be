import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class InviteUserDto {
  @ApiProperty({ description: 'The email of the user to invite' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
  @IsString()
  @IsNotEmpty()
  roleId: string;
}

export class UpdateMemberRoleDto {
  @IsString()
  @IsNotEmpty()
  roleId: string;
}

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
