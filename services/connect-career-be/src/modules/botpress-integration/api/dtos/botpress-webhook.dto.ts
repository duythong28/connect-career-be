import { IsString, IsObject, IsOptional, IsArray } from 'class-validator';

export class BotpressWebhookDto {
  @IsString()
  userId: string;

  @IsString()
  sessionId: string;

  @IsString()
  intent: string;

  @IsObject()
  @IsOptional()
  entities?: Record<string, any>;

  @IsString()
  text: string;

  @IsArray()
  @IsOptional()
  conversationHistory?: any[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
