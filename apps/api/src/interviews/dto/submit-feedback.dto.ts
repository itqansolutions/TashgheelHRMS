import { IsEnum, IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';
import { RecommendationStatus } from '@repo/database';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitFeedbackDto {
  @ApiProperty({ enum: RecommendationStatus, example: RecommendationStatus.HIRE })
  @IsEnum(RecommendationStatus)
  @IsNotEmpty()
  recommendation: RecommendationStatus;

  @ApiPropertyOptional({ example: 'Excellent coding skills and strong cultural fit.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    example: {
      'Technical Capability': 4,
      'Communication Skills': 5,
      'Problem Solving': 4,
    },
  })
  @IsObject()
  @IsNotEmpty()
  competencyRatings: Record<string, number>;
}
