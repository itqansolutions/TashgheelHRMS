import { IsString, IsOptional, IsUrl, IsEnum, IsUUID } from 'class-validator';
import { CompanyStatus } from '@repo/database';

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsUrl({}, { message: 'website must be a valid URL' })
  @IsOptional()
  website?: string;

  @IsUUID()
  @IsOptional()
  accountManagerId?: string;

  @IsEnum(CompanyStatus)
  @IsOptional()
  status?: CompanyStatus;
}
