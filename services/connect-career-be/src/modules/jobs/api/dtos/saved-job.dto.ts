import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SaveJobDto {
  @IsNotEmpty()
  @IsUUID()
  jobId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  folderName?: string;
}

export class UpdateSavedJobDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  folderName?: string;
}