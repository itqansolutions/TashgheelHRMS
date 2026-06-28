import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { VisaWorkflowsService } from './visa-workflows.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Visa Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('visa-workflows')
export class VisaWorkflowsController {
  constructor(private readonly visaWorkflowsService: VisaWorkflowsService) {}

  @Post()
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Create a new visa workflow for a specific country' })
  async create(@Body() body: any) {
    const data = await this.visaWorkflowsService.create(body);
    return { success: true, data };
  }

  @Get()
  @Permissions('settings:read')
  @ApiOperation({ summary: 'Get all visa workflows' })
  async findAll() {
    const data = await this.visaWorkflowsService.findAll();
    return { success: true, data };
  }

  @Get(':id')
  @Permissions('settings:read')
  @ApiOperation({ summary: 'Get details of a specific visa workflow' })
  async findOne(@Param('id') id: string) {
    const data = await this.visaWorkflowsService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Update a visa workflow' })
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.visaWorkflowsService.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  @Permissions('settings:write')
  @ApiOperation({ summary: 'Delete a visa workflow' })
  async remove(@Param('id') id: string) {
    await this.visaWorkflowsService.remove(id);
    return { success: true };
  }
}
