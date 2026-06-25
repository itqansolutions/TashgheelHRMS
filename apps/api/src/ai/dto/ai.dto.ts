import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GenerateJdDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  keywords?: string;
}

export class GenerateQuestionsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  candidateId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  jobOpeningId: string;
}
