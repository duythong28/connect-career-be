import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MediaAttachmentDto } from './media-attachment.dto';

export class ChatRequestDto {
  @ApiPropertyOptional({ description: 'User message content' })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({
    description: 'Media attachments',
    type: [MediaAttachmentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaAttachmentDto)
  @IsOptional()
  attachments?: MediaAttachmentDto[];

  @ApiPropertyOptional({ description: 'Additional context metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
