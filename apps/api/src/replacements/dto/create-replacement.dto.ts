import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ReplacementReason } from '@repo/database';

export class CreateReplacementDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  placementId: string;

  @ApiProperty({ enum: ReplacementReason })
  @IsEnum(ReplacementReason)
  @IsNotEmpty()
  reason: ReplacementReason;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  detailNotes?: string;
}
