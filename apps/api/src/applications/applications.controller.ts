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
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { TransitionStageDto } from './dto/transition-stage.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @Permissions('applications:write')
  @ApiOperation({ summary: 'Register a candidate application for a job opening' })
  async create(
    @Body() dto: CreateApplicationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.applicationsService.create(dto, actor.id);
    return { success: true, data };
  }

  @Get()
  @Permissions('applications:read')
  @ApiOperation({ summary: 'Get all candidate applications (filtered + paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'candidateId', required: false, type: String })
  @ApiQuery({ name: 'jobOpeningId', required: false, type: String })
  @ApiQuery({ name: 'recruiterId', required: false, type: String })
  @ApiQuery({ name: 'stage', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('candidateId') candidateId?: string,
    @Query('jobOpeningId') jobOpeningId?: string,
    @Query('recruiterId') recruiterId?: string,
    @Query('stage') stage?: string,
  ) {
    const result = await this.applicationsService.findAll({
      page,
      limit,
      candidateId,
      jobOpeningId,
      recruiterId,
      stage,
    });
    return { success: true, ...result };
  }

  @Get('pipeline/:jobOpeningId')
  @Permissions('applications:read')
  @ApiOperation({ summary: 'Get all applications for a job opening (for Kanban board pipeline)' })
  async getPipelineSummary(@Param('jobOpeningId') jobOpeningId: string) {
    const data = await this.applicationsService.getPipelineSummary(jobOpeningId);
    return { success: true, data };
  }

  @Get(':id')
  @Permissions('applications:read')
  @ApiOperation({ summary: 'Get details of a specific application including timeline log' })
  async findOne(@Param('id') id: string) {
    const data = await this.applicationsService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id/stage')
  @Permissions('applications:write')
  @ApiOperation({ summary: 'Transition an application stage' })
  async transitionStage(
    @Param('id') id: string,
    @Body() dto: TransitionStageDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.applicationsService.transitionStage(id, dto, actor.id);
    return { success: true, data };
  }

  @Delete(':id')
  @Permissions('applications:write')
  @ApiOperation({ summary: 'Delete a candidate application' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.applicationsService.remove(id, actor.id);
    return result;
  }
}
