import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PlacementStatus, GuaranteeStatus } from '@repo/database';

export class UpdatePlacementDto {
  @ApiPropertyOptional({ enum: PlacementStatus })
  @IsEnum(PlacementStatus)
  @IsOptional()
  status?: PlacementStatus;

  @ApiPropertyOptional({ enum: GuaranteeStatus })
  @IsEnum(GuaranteeStatus)
  @IsOptional()
  guaranteeStatus?: GuaranteeStatus;
}
