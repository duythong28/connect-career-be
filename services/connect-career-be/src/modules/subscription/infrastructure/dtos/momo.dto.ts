import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class MoMoWebhookDto {
  @ApiProperty()
  @IsString()
  partnerCode: string;

  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty()
  @IsString()
  requestId: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsString()
  orderInfo: string;

  @ApiProperty()
  @IsString()
  orderType: string;

  @ApiProperty()
  @IsNumber()
  transId: number;

  @ApiProperty()
  @IsNumber()
  resultCode: number;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty()
  @IsString()
  payType: string;

  @ApiProperty()
  @IsNumber()
  responseTime: number;

  @ApiProperty()
  @IsString()
  extraData: string;

  @ApiProperty()
  @IsString()
  signature: string;
}
