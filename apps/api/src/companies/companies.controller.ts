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
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Permissions('companies:write')
  @ApiOperation({ summary: 'Create a new company client' })
  async create(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.companiesService.create(dto, actor.id);
    return { success: true, data };
  }

  @Get()
  @Permissions('companies:read')
  @ApiOperation({ summary: 'Get all companies (paginated + filtered)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'accountManagerId', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('accountManagerId') accountManagerId?: string,
  ) {
    const result = await this.companiesService.findAll({
      page,
      limit,
      search,
      status,
      accountManagerId,
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @Permissions('companies:read')
  @ApiOperation({ summary: 'Get details of a specific company' })
  async findOne(@Param('id') id: string) {
    const data = await this.companiesService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  @Permissions('companies:write')
  @ApiOperation({ summary: 'Update a specific company' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.companiesService.update(id, dto, actor.id);
    return { success: true, data };
  }

  @Delete(':id')
  @Permissions('companies:write')
  @ApiOperation({ summary: 'Soft delete a specific company' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.companiesService.remove(id, actor.id);
    return result;
  }
}
