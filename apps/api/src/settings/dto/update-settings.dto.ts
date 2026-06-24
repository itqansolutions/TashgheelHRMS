import { IsObject, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'Key-value map of settings to update (e.g. { "company.name": "Tashgheel" })',
  })
  @IsObject()
  settings: Record<string, string>;
}
