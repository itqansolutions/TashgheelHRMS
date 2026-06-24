import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { UpdateRequisitionDto } from './dto/update-requisition.dto';
import { UpdateOpeningStatusDto } from './dto/update-opening-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // --- REQUISITIONS ---

  @Post('requisitions')
  @Permissions('jobs:write')
  @ApiOperation({ summary: 'Create a new job requisition' })
  async createRequisition(
    @Body() dto: CreateRequisitionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.jobsService.createRequisition(dto, actor.id);
    return { success: true, data };
  }

  @Get('requisitions')
  @Permissions('jobs:read')
  @ApiOperation({ summary: 'Get all job requisitions (paginated + filtered)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  async findAllRequisitions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('companyId') companyId?: string,
  ) {
    const result = await this.jobsService.findAllRequisitions({
      page,
      limit,
      search,
      status,
      companyId,
    });
    return { success: true, ...result };
  }

  @Get('requisitions/:id')
  @Permissions('jobs:read')
  @ApiOperation({ summary: 'Get details of a specific job requisition' })
  async findOneRequisition(@Param('id') id: string) {
    const data = await this.jobsService.findOneRequisition(id);
    return { success: true, data };
  }

  @Patch('requisitions/:id')
  @Permissions('jobs:write')
  @ApiOperation({ summary: 'Update a specific job requisition' })
  async updateRequisition(
    @Param('id') id: string,
    @Body() dto: UpdateRequisitionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.jobsService.updateRequisition(id, dto, actor.id);
    return { success: true, data };
  }

  @Post('requisitions/:id/approve')
  @Permissions('jobs:approve')
  @ApiOperation({ summary: 'Approve a job requisition (creates a Job Opening)' })
  async approveRequisition(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.jobsService.approveRequisition(id, actor.id);
    return { success: true, ...result };
  }

  @Post('requisitions/:id/reject')
  @Permissions('jobs:approve')
  @ApiOperation({ summary: 'Reject a job requisition with a reason' })
  async rejectRequisition(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!reason || reason.trim() === '') {
      throw new BadRequestException('Rejection reason is required');
    }
    const data = await this.jobsService.rejectRequisition(id, reason, actor.id);
    return { success: true, data };
  }

  // --- OPENINGS ---

  @Get('openings')
  @Permissions('jobs:read')
  @ApiOperation({ summary: 'Get all job openings (paginated + filtered)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  async findAllOpenings(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('companyId') companyId?: string,
  ) {
    const result = await this.jobsService.findAllOpenings({
      page,
      limit,
      search,
      status,
      companyId,
    });
    return { success: true, ...result };
  }

  @Get('openings/:id')
  @Permissions('jobs:read')
  @ApiOperation({ summary: 'Get details of a specific job opening' })
  async findOneOpening(@Param('id') id: string) {
    const data = await this.jobsService.findOneOpening(id);
    return { success: true, data };
  }

  @Patch('openings/:id/status')
  @Permissions('jobs:write')
  @ApiOperation({ summary: 'Update the status of a job opening' })
  async updateOpeningStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOpeningStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.jobsService.updateOpeningStatus(id, dto.status, actor.id);
    return { success: true, data };
  }
}
