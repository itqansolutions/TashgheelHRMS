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
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, UpdateInvoiceStatusDto } from './dto/invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InvoiceStatus } from '@repo/database';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Permissions('finance:write')
  @ApiOperation({ summary: 'Create a new invoice' })
  async create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.invoicesService.create(dto, actor.id);
    return { success: true, data };
  }

  @Get()
  @Permissions('finance:read')
  @ApiOperation({ summary: 'Find all invoices' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: InvoiceStatus,
    @Query('companyId') companyId?: string,
  ) {
    const result = await this.invoicesService.findAll({ page, limit, status, companyId });
    return { success: true, ...result };
  }

  @Get(':id')
  @Permissions('finance:read')
  @ApiOperation({ summary: 'Get details of a specific invoice' })
  async findOne(@Param('id') id: string) {
    const data = await this.invoicesService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id/status')
  @Permissions('finance:write')
  @ApiOperation({ summary: 'Update invoice status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.invoicesService.updateStatus(id, dto, actor.id);
    return { success: true, data };
  }
}
