import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  OrganizationSize,
  OrganizationType,
  OvertimePolicy,
  WorkingDay,
  WorkScheduleType,
} from '../../domain/entities/organization.entity';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  abbreviation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  formerNames?: string[];

  @IsOptional()
  @IsEnum(OrganizationType)
  organizationType?: OrganizationType;

  @IsOptional()
  @IsUUID()
  industryId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  subIndustryIds?: string[];

  @IsOptional()
  @IsEnum(OrganizationSize)
  organizationSize?: OrganizationSize;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000000)
  employeeCount?: number;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  stateProvince?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  headquartersAddress?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(WorkingDay, { each: true })
  workingDays?: WorkingDay[];

  @IsOptional()
  @IsString()
  workingHours?: string;

  @IsOptional()
  @IsEnum(OvertimePolicy)
  overtimePolicy?: OvertimePolicy;

  @IsOptional()
  @IsArray()
  @IsEnum(WorkScheduleType, { each: true })
  workScheduleTypes?: WorkScheduleType[];

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  longDescription?: string;

  @IsOptional()
  @IsString()
  mission?: string;

  @IsOptional()
  @IsString()
  vision?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coreValues?: string[];
  @IsOptional()
  @IsObject()
  productsServices?: any;

  @IsOptional()
  @IsObject()
  requiredSkills?: any;

  @IsOptional()
  @IsObject()
  benefits?: any;

  @IsOptional()
  @IsObject()
  culture?: any;

  @IsOptional()
  @IsUUID()
  logoFileId?: string;

  @IsOptional()
  @IsUUID()
  bannerFileId?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  hrEmail?: string;

  @IsOptional()
  @IsString()
  hrPhone?: string;

  @IsOptional()
  @IsObject()
  socialMedia?: any;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  fiscalYearEnd?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  awardsRecognition?: string[];

  @IsOptional()
  @IsArray()
  certifications?: any[];
}
