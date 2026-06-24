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
import { ReplacementsService } from './replacements.service';
import { CreateReplacementDto } from './dto/create-replacement.dto';
import { UpdateReplacementDto } from './dto/update-replacement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReplacementStatus } from '@repo/database';

@ApiTags('Replacements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('replacements')
export class ReplacementsController {
  constructor(private readonly replacementsService: ReplacementsService) {}

  @Post()
  @Permissions('placements:write')
  @ApiOperation({ summary: 'Create a new replacement request for a placement' })
  async create(
    @Body() dto: CreateReplacementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.replacementsService.create(dto, actor.id);
    return { success: true, data };
  }

  @Get()
  @Permissions('placements:read')
  @ApiOperation({ summary: 'Find all replacements with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ReplacementStatus })
  @ApiQuery({ name: 'placementId', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ReplacementStatus,
    @Query('placementId') placementId?: string,
  ) {
    const result = await this.replacementsService.findAll({
      page,
      limit,
      status,
      placementId,
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @Permissions('placements:read')
  @ApiOperation({ summary: 'Get details of a specific replacement request' })
  async findOne(@Param('id') id: string) {
    const data = await this.replacementsService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  @Permissions('placements:write')
  @ApiOperation({ summary: 'Update replacement request status' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReplacementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.replacementsService.update(id, dto, actor.id);
    return { success: true, data };
  }
}
