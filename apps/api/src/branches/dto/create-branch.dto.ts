import { IsString, IsUUID } from 'class-validator';

export class CreateBranchDto {
  @IsUUID()
  companyId: string;

  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  country: string;
}
