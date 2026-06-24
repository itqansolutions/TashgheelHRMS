import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @Permissions('companies:write')
  @ApiOperation({ summary: 'Log a new CRM/ATS activity' })
  async create(
    @Body() dto: CreateActivityDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.activitiesService.create(dto, actor.id);
    return { success: true, data };
  }

  @Get()
  @Permissions('companies:read')
  @ApiOperation({ summary: 'Get all activities (paginated + filtered)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  @ApiQuery({ name: 'contactId', required: false, type: String })
  @ApiQuery({ name: 'candidateId', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('companyId') companyId?: string,
    @Query('contactId') contactId?: string,
    @Query('candidateId') candidateId?: string,
  ) {
    const result = await this.activitiesService.findAll({
      page,
      limit,
      companyId,
      contactId,
      candidateId,
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @Permissions('companies:read')
  @ApiOperation({ summary: 'Get details of a specific activity' })
  async findOne(@Param('id') id: string) {
    const data = await this.activitiesService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  @Permissions('companies:write')
  @ApiOperation({ summary: 'Update/Edit a logged activity' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.activitiesService.update(id, dto, actor.id);
    return { success: true, data };
  }

  @Delete(':id')
  @Permissions('companies:write')
  @ApiOperation({ summary: 'Delete a logged activity' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.activitiesService.remove(id, actor.id);
    return result;
  }
}
