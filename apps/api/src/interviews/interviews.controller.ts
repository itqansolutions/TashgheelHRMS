import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewStatusDto } from './dto/update-interview-status.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InterviewStatus } from '@repo/database';

@ApiTags('Interviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post()
  @Permissions('interviews:write')
  @ApiOperation({ summary: 'Schedule a new interview for an application' })
  async create(
    @Body() dto: CreateInterviewDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.interviewsService.create(dto, actor.id);
    return { success: true, data };
  }

  @Get()
  @Permissions('interviews:read')
  @ApiOperation({ summary: 'Find all interviews with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'candidateId', required: false, type: String })
  @ApiQuery({ name: 'recruiterId', required: false, type: String })
  @ApiQuery({ name: 'interviewerId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: InterviewStatus })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('candidateId') candidateId?: string,
    @Query('recruiterId') recruiterId?: string,
    @Query('interviewerId') interviewerId?: string,
    @Query('status') status?: InterviewStatus,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const result = await this.interviewsService.findAll({
      page,
      limit,
      candidateId,
      recruiterId,
      interviewerId,
      status,
      fromDate,
      toDate,
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @Permissions('interviews:read')
  @ApiOperation({ summary: 'Get details of a specific interview' })
  async findOne(@Param('id') id: string) {
    const data = await this.interviewsService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id/status')
  @Permissions('interviews:write')
  @ApiOperation({ summary: 'Update interview status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateInterviewStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.interviewsService.updateStatus(id, dto, actor.id);
    return { success: true, data };
  }

  @Post(':id/feedback')
  @Permissions('interviews:write')
  @ApiOperation({ summary: 'Submit feedback for an interview session' })
  async submitFeedback(
    @Param('id') id: string,
    @Body() dto: SubmitFeedbackDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.interviewsService.submitFeedback(id, dto, actor.id);
    return { success: true, data };
  }
}
