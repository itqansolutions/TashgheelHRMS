import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OfferStatus } from '@repo/database';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOfferStatusDto {
  @ApiProperty({ enum: OfferStatus, example: OfferStatus.ACCEPTED })
  @IsEnum(OfferStatus)
  @IsNotEmpty()
  status: OfferStatus;

  @ApiPropertyOptional({ example: 'Candidate accepted a different offer' })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
