import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ReplacementStatus } from '@repo/database';

export class UpdateReplacementDto {
  @ApiPropertyOptional({ enum: ReplacementStatus })
  @IsEnum(ReplacementStatus)
  @IsOptional()
  status?: ReplacementStatus;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  replacementCandidateId?: string;
}
