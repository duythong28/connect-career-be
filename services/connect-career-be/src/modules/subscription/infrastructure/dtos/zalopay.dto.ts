import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ZaloPayWebhookDto {
  @ApiProperty()
  @IsString()
  data: string;

  @ApiProperty()
  @IsString()
  mac: string;
}

export class ZaloPayQueryStatusDto {
  @ApiProperty()
  @IsString()
  app_trans_id: string;
}
