import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApplicationStage } from '@repo/database';

export class TransitionStageDto {
  @IsEnum(ApplicationStage)
  stage: ApplicationStage;

  @IsString()
  @IsOptional()
  note?: string;
}
