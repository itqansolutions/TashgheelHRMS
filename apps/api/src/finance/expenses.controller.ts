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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExpenseCategory } from '@repo/database';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Permissions('finance:write')
  @ApiOperation({ summary: 'Record a new expense' })
  async create(
    @Body() dto: CreateExpenseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.expensesService.create(dto, actor.id);
    return { success: true, data };
  }

  @Get()
  @Permissions('finance:read')
  @ApiOperation({ summary: 'Find all expenses' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, enum: ExpenseCategory })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: ExpenseCategory,
  ) {
    const result = await this.expensesService.findAll({ page, limit, category });
    return { success: true, ...result };
  }

  @Get(':id')
  @Permissions('finance:read')
  @ApiOperation({ summary: 'Get details of a specific expense' })
  async findOne(@Param('id') id: string) {
    const data = await this.expensesService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  @Permissions('finance:write')
  @ApiOperation({ summary: 'Update an expense record' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.expensesService.update(id, dto, actor.id);
    return { success: true, data };
  }
}
