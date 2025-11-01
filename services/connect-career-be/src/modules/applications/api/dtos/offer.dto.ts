import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';
import {
  OfferStatus,
  OfferType,
  SalaryPeriod,
} from '../../domain/entities/offer.entity';

export class CreateOfferDto {
  @ApiProperty()
  @IsNumber()
  baseSalary: number;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiProperty({ enum: SalaryPeriod })
  @IsEnum(SalaryPeriod)
  salaryPeriod: SalaryPeriod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  signingBonus?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  equity?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  benefits?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty()
  @IsString()
  offeredBy: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isNegotiable?: boolean;
}

export class CreateOfferCandidateDto extends CreateOfferDto {
  @ApiProperty()
  @IsString()
  isOfferedByCandidate: boolean;
}

export class UpdateOfferDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  baseSalary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: SalaryPeriod })
  @IsOptional()
  @IsEnum(SalaryPeriod)
  salaryPeriod?: SalaryPeriod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  signingBonus?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  equity?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  benefits?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isNegotiable?: boolean;
}

export class RecordOfferResponseDto {
  @ApiProperty({ enum: OfferStatus })
  @IsEnum(OfferStatus)
  response: OfferStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  candidateNotes?: string;

  @ApiProperty()
  @IsString()
  recordedBy: string;
}

export class OfferDetailResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  applicationId: string;

  @ApiProperty({ enum: OfferStatus })
  status: OfferStatus;

  @ApiProperty({ enum: OfferType })
  offerType: OfferType;

  @ApiProperty()
  version: number;

  @ApiProperty()
  baseSalary: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: SalaryPeriod })
  salaryPeriod: SalaryPeriod;

  @ApiPropertyOptional()
  signingBonus?: number;

  @ApiPropertyOptional()
  equity?: string;

  @ApiPropertyOptional({ type: [String] })
  benefits?: string[];

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  offeredBy: string;

  @ApiProperty()
  isNegotiable: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  expiryDate?: Date;
}
