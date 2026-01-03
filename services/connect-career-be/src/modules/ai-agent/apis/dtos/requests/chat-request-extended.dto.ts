import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsBoolean,
  IsUUID,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MediaAttachmentDto } from '../media-attachment.dto';

export class ChatRequestExtendedDto {
  @ApiPropertyOptional({ description: 'User message content' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'Media attachments',
    type: [MediaAttachmentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaAttachmentDto)
  @IsOptional()
  attachments?: MediaAttachmentDto[];

  @ApiPropertyOptional({ description: 'Enable search functionality' })
  @IsBoolean()
  @IsOptional()
  search_enabled?: boolean;

  @ApiPropertyOptional({ description: 'ID of clicked suggestion' })
  @IsString()
  @IsOptional()
  clicked_suggestion_id?: string;

  @ApiPropertyOptional({ description: 'ID of message being retried' })
  @IsUUID()
  @IsOptional()
  retried_message_id?: string;

  @ApiPropertyOptional({ description: 'Number of manual retry attempts' })
  @IsNumber()
  @IsOptional()
  manual_retry_attempts?: number;

  @ApiPropertyOptional({ description: 'Additional context metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
