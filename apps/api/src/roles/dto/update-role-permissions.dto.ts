import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRolePermissionsDto {
  @ApiProperty({ type: [String], description: 'List of permission IDs to assign to the role' })
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}
