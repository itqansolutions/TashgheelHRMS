import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ApplicationStage } from '@repo/database';

export class CreateApplicationDto {
  @IsUUID()
  candidateId: string;

  @IsUUID()
  jobOpeningId: string;

  @IsUUID()
  @IsOptional()
  recruiterId?: string;

  @IsEnum(ApplicationStage)
  @IsOptional()
  stage?: ApplicationStage;
}
