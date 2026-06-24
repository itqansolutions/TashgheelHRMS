import { IsString, IsOptional, IsEnum, IsUUID, IsNumber, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { JobType, JobRequisitionStatus } from '@repo/database';

export class CreateRequisitionDto {
  @IsString()
  title: string;

  @IsString()
  department: string;

  @IsUUID()
  companyId: string;

  @IsString()
  location: string;

  @IsEnum(JobType)
  type: JobType;

  @IsNumber()
  @IsOptional()
  salaryMin?: number;

  @IsNumber()
  @IsOptional()
  salaryMax?: number;

  @IsString()
  descriptionEn: string;

  @IsString()
  @IsOptional()
  descriptionAr?: string;

  @IsString()
  requirementsEn: string;

  @IsString()
  @IsOptional()
  requirementsAr?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  deadline?: Date;

  @IsEnum(JobRequisitionStatus)
  @IsOptional()
  status?: JobRequisitionStatus;
}
