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
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Permissions('companies:write')
  @ApiOperation({ summary: 'Create a new client company branch' })
  async create(
    @Body() dto: CreateBranchDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.branchesService.create(dto, actor.id);
    return { success: true, data };
  }

  @Get()
  @Permissions('companies:read')
  @ApiOperation({ summary: 'Get all branches (paginated + filtered)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('companyId') companyId?: string,
  ) {
    const result = await this.branchesService.findAll({
      page,
      limit,
      companyId,
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @Permissions('companies:read')
  @ApiOperation({ summary: 'Get details of a specific branch' })
  async findOne(@Param('id') id: string) {
    const data = await this.branchesService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  @Permissions('companies:write')
  @ApiOperation({ summary: 'Update a specific branch' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.branchesService.update(id, dto, actor.id);
    return { success: true, data };
  }

  @Delete(':id')
  @Permissions('companies:write')
  @ApiOperation({ summary: 'Delete a specific branch' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.branchesService.remove(id, actor.id);
    return result;
  }
}
