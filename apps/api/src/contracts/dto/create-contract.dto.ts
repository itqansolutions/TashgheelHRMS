import { IsString, IsOptional, IsEnum, IsUUID, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ContractStatus } from '@repo/database';

export class CreateContractDto {
  @IsUUID()
  companyId: string;

  @IsString()
  contractNumber: string;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @IsEnum(ContractStatus)
  @IsOptional()
  status?: ContractStatus;
}
