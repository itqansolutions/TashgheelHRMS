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
import { PlacementsService } from './placements.service';
import { CreatePlacementDto } from './dto/create-placement.dto';
import { UpdatePlacementDto } from './dto/update-placement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GuaranteeStatus, PlacementStatus } from '@repo/database';

@ApiTags('Placements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('placements')
export class PlacementsController {
  constructor(private readonly placementsService: PlacementsService) {}

  @Post()
  @Permissions('placements:write')
  @ApiOperation({ summary: 'Create a new placement (usually from an accepted offer)' })
  async create(
    @Body() dto: CreatePlacementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.placementsService.create(dto, actor.id);
    return { success: true, data };
  }

  @Get()
  @Permissions('placements:read')
  @ApiOperation({ summary: 'Find all placements with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: PlacementStatus })
  @ApiQuery({ name: 'guaranteeStatus', required: false, enum: GuaranteeStatus })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: PlacementStatus,
    @Query('guaranteeStatus') guaranteeStatus?: GuaranteeStatus,
    @Query('companyId') companyId?: string,
  ) {
    const result = await this.placementsService.findAll({
      page,
      limit,
      status,
      guaranteeStatus,
      companyId,
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @Permissions('placements:read')
  @ApiOperation({ summary: 'Get details of a specific placement' })
  async findOne(@Param('id') id: string) {
    const data = await this.placementsService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  @Permissions('placements:write')
  @ApiOperation({ summary: 'Update placement status and guarantee status' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePlacementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.placementsService.update(id, dto, actor.id);
    return { success: true, data };
  }
}
