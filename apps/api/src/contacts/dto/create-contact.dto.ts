import { IsString, IsOptional, IsEmail, IsBoolean, IsUUID } from 'class-validator';

export class CreateContactDto {
  @IsUUID()
  companyId: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  linkedinUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
