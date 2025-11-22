import {
  IsString,
  IsUUID,
  IsEmail,
  IsOptional,
  IsObject,
} from 'class-validator';

export class RegisterCallDto {
  @IsUUID()
  interviewerId: string;

  @IsUUID()
  sessionId: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  dynamicData?: Record<string, any>;
}
