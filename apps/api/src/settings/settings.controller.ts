import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Permissions('settings:read')
  @ApiOperation({ summary: 'Get all system and company settings grouped by category' })
  async findAll() {
    const data = await this.settingsService.findAll();
    return { success: true, data };
  }

  @Patch()
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Update system and company settings' })
  async update(
    @Body() dto: UpdateSettingsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.settingsService.update(dto, actor.id);
    return data;
  }
}
