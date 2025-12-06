import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class VNPayReturnUrlQueryDto {
  @ApiProperty()
  @IsString()
  vnp_TmnCode: string;

  @ApiProperty()
  @IsString()
  vnp_Amount: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  vnp_BankCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  vnp_BankTranNo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  vnp_CardType?: string;

  @ApiProperty()
  @IsString()
  vnp_PayDate: string;

  @ApiProperty()
  @IsString()
  vnp_OrderInfo: string;

  @ApiProperty()
  @IsString()
  vnp_TransactionNo: string;

  @ApiProperty()
  @IsString()
  vnp_ResponseCode: string;

  @ApiProperty()
  @IsString()
  vnp_TransactionStatus: string;

  @ApiProperty()
  @IsString()
  vnp_TxnRef: string;

  @ApiProperty()
  @IsString()
  vnp_SecureHash: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  vnp_SecureHashType?: string;
}

export class VNPayQueryStatusDto {
  @ApiProperty()
  @IsString()
  orderId: string;
}
