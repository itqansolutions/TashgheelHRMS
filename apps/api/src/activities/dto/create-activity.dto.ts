import { IsString, IsOptional, IsEnum, IsUUID, IsBoolean, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { CRMActivityType } from '@repo/database';

export class CreateActivityDto {
  @IsEnum(CRMActivityType)
  type: CRMActivityType;

  @IsString()
  subject: string;

  @IsString()
  content: string;

  @IsUUID()
  @IsOptional()
  companyId?: string;

  @IsUUID()
  @IsOptional()
  contactId?: string;

  @IsUUID()
  @IsOptional()
  candidateId?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  dueDate?: Date;

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}
