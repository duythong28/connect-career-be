import { IsUUID } from 'class-validator';

export class GenerateInsightsDto {
  @IsUUID()
  sessionId: string;
}
