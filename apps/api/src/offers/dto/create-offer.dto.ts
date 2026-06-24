import { IsNotEmpty, IsNumber, IsString, IsUUID, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfferDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({ example: 8500.00 })
  @IsNumber()
  @IsNotEmpty()
  salaryAmount: number;

  @ApiProperty({ example: 'SAR' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiPropertyOptional({ example: 'Medical Insurance, Flight tickets annually, 30 days paid leave' })
  @IsString()
  @IsOptional()
  benefits?: string;

  @ApiProperty({ example: '2026-07-01T08:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-06-30T17:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  expiryDate: string;
}
