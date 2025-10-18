export class InviteUserDto {
  email: string;
  roleId: string;
}

export class UpdateMemberRoleDto {
  roleId: string;
}

export class AcceptInvitationDto {
  token: string;
}
