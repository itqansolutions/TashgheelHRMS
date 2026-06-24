import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CandidateAvailability, SkillProficiency } from '@repo/database';

export class CandidateExperienceDto {
  @IsString()
  companyName: string;

  @IsString()
  title: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CandidateEducationDto {
  @IsString()
  institution: string;

  @IsString()
  degree: string;

  @IsString()
  @IsOptional()
  fieldOfStudy?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class CandidateSkillDto {
  @IsString()
  skillName: string;

  @IsEnum(SkillProficiency)
  @IsOptional()
  proficiency?: SkillProficiency;
}

export class CreateCandidateDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  linkedinUrl?: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsString()
  @IsOptional()
  currentLocation?: string;

  @IsNumber()
  @IsOptional()
  expectedSalary?: number;

  @IsEnum(CandidateAvailability)
  @IsOptional()
  availability?: CandidateAvailability;

  @IsString()
  @IsOptional()
  source?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateExperienceDto)
  @IsOptional()
  experience?: CandidateExperienceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateEducationDto)
  @IsOptional()
  education?: CandidateEducationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateSkillDto)
  @IsOptional()
  skills?: CandidateSkillDto[];
}
