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
} from 'class-validator';
import {
  OrganizationSize,
  OrganizationType,
  OvertimePolicy,
  WorkingDay,
  WorkScheduleType,
} from '../../domain/entities/organization.entity';

export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  abbreviation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  formerNames?: string[];

  @IsEnum(OrganizationType)
  organizationType: OrganizationType;

  @IsUUID()
  industryId: string;

  @IsOptional()
  @IsArray()
  subIndustryIds?: string[];

  @IsEnum(OrganizationSize)
  organizationSize: OrganizationSize;

  @IsOptional()
  @IsNumber()
  employeeCount?: number;

  @IsString()
  country: string;

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

  @IsArray()
  @IsEnum(WorkingDay, { each: true })
  workingDays: WorkingDay[];

  @IsOptional()
  @IsString()
  workingHours?: string;

  @IsEnum(OvertimePolicy)
  overtimePolicy: OvertimePolicy;

  @IsArray()
  @IsEnum(WorkScheduleType, { each: true })
  workScheduleTypes: WorkScheduleType[];

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
  productsServices?: {
    primary: string[];
    secondary: string[];
    targetMarkets: string[];
    specializations: string[];
  };

  @IsOptional()
  @IsObject()
  requiredSkills?: {
    hardSkills: string[];
    softSkills: string[];
    certifications: string[];
    languages: string[];
    experienceLevels: string[];
    educationRequirements: string[];
  };

  @IsOptional()
  @IsObject()
  benefits?: {
    compensation: string[];
    healthWellness: string[];
    timeOff: string[];
    professionalDevelopment: string[];
    workLifeBalance: string[];
    additionalPerks: string[];
    retirementBenefits: string[];
  };

  @IsOptional()
  @IsObject()
  culture?: {
    highlights: string[];
    workEnvironment: string[];
    teamStructure: string[];
    communicationStyle: string[];
    decisionMaking: string[];
    diversityInclusion: string[];
  };

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
  @IsString()
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
  socialMedia?: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    glassdoor?: string;
    indeed?: string;
    others?: string[];
  };

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsDateString()
  foundedDate?: string;

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
  certifications?: {
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate?: string;
    certificateFileId?: string;
  }[];
}
