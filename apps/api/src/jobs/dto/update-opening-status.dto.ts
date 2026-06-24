import { IsEnum } from 'class-validator';
import { JobOpeningStatus } from '@repo/database';

export class UpdateOpeningStatusDto {
  @IsEnum(JobOpeningStatus)
  status: JobOpeningStatus;
}
