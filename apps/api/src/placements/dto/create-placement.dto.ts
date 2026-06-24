import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsNumber, IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum FeeType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
}

export class CreatePlacementDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  offerId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  feeAmount: number;

  @ApiProperty({ enum: FeeType })
  @IsEnum(FeeType)
  @IsNotEmpty()
  feeType: FeeType;

  @ApiPropertyOptional({ default: 90 })
  @IsNumber()
  @IsOptional()
  guaranteeDays?: number;
}
