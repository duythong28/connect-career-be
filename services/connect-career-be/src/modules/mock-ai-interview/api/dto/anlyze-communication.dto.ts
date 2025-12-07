import { IsString } from 'class-validator';

export class AnalyzeCommunicationDto {
  @IsString()
  transcript: string;
}
