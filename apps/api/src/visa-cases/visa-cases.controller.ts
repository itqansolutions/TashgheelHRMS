import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { VisaCasesService } from './visa-cases.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { VisaCaseStatus } from '@repo/database';

@ApiTags('Visa Cases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('visa-cases')
export class VisaCasesController {
  constructor(private readonly visaCasesService: VisaCasesService) {}

  @Post()
  @Permissions('placements:write')
  @ApiOperation({ summary: 'Create a new visa case from a placement' })
  async create(
    @Body() body: { placementId: string; workflowId?: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.visaCasesService.create(body, actor.id);
    return { success: true, data };
  }

  @Get('kanban')
  @Permissions('placements:read')
  @ApiOperation({ summary: 'Get all visa cases for kanban board' })
  @ApiQuery({ name: 'workflowId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: VisaCaseStatus })
  async findAll(
    @Query('workflowId') workflowId?: string,
    @Query('status') status?: VisaCaseStatus,
  ) {
    const data = await this.visaCasesService.findAll({ workflowId, status });
    return { success: true, data };
  }

  @Get(':id')
  @Permissions('placements:read')
  @ApiOperation({ summary: 'Get details of a specific visa case' })
  async findOne(@Param('id') id: string) {
    const data = await this.visaCasesService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id/stage')
  @Permissions('placements:write')
  @ApiOperation({ summary: 'Update visa case stage (Kanban drag and drop)' })
  async updateStage(
    @Param('id') id: string,
    @Body() body: { stageId: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.visaCasesService.updateStage(id, body.stageId, actor.id);
    return { success: true, data };
  }
}
