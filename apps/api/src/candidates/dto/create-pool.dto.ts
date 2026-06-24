import { IsString, IsOptional } from 'class-validator';

export class CreatePoolDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
