import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Roles & Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('users:read')
  @ApiOperation({ summary: 'List all roles with their assigned permissions' })
  async findAll() {
    const data = await this.rolesService.findAll();
    return { success: true, data };
  }

  @Get('permissions')
  @Permissions('users:read')
  @ApiOperation({ summary: 'List all system permissions' })
  async listPermissions() {
    const data = await this.rolesService.listPermissions();
    return { success: true, data };
  }

  @Get(':id')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get details of a single role by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.rolesService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id/permissions')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Update permissions for a specific role' })
  async updatePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.rolesService.updatePermissions(id, dto, actor.id);
    return data;
  }
}
