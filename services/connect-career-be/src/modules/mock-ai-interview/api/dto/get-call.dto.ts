import { IsString } from 'class-validator';

export class GetCallDto {
  @IsString()
  callId: string;
}
