import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { InterviewStatus } from '@repo/database';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInterviewStatusDto {
  @ApiProperty({ enum: InterviewStatus, example: InterviewStatus.COMPLETED })
  @IsEnum(InterviewStatus)
  @IsNotEmpty()
  status: InterviewStatus;

  @ApiPropertyOptional({ example: 'Candidate requested rescheduling' })
  @IsString()
  @IsOptional()
  cancellationReason?: string;
}
