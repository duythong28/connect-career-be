import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MediaType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
}

export enum MediaSourceType {
  URL = 'url',
  BASE64 = 'base64',
}

export class MediaAttachmentDto {
  @ApiProperty({
    enum: ['image', 'document', 'video', 'audio'],
    example: 'image',
  })
  @IsString()
  type: string;

  @IsOptional()
  sourceType?: MediaSourceType = MediaSourceType.URL;  

  @ApiProperty({
    description: 'Public URL to the media (required if sourceType=url)',
    required: false,
  })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiProperty({
    description: 'Base64 content (required if sourceType=base64)',
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ description: 'Original file name', example: 'file.png' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'MIME type', example: 'image/png' })
  @IsString()
  mimeType: string;
}
