import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsDateString, IsArray } from 'class-validator';
import { InterviewType } from '@repo/database';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInterviewDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({ enum: InterviewType, example: InterviewType.TECHNICAL })
  @IsEnum(InterviewType)
  @IsNotEmpty()
  type: InterviewType;

  @ApiProperty({ example: '2026-06-25T10:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @ApiPropertyOptional({ example: 'Meeting Room 3' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg-hij' })
  @IsString()
  @IsOptional()
  videoLink?: string;

  @ApiProperty({ type: [String], example: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'] })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsNotEmpty()
  interviewerIds: string[];
}
