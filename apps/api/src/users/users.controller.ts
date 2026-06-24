import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users:read')
  @ApiOperation({ summary: 'List all users with pagination' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.usersService.findAll({ page, limit, search, status });
    return { success: true, data };
  }

  @Get('roles')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get all available roles' })
  async getRoles() {
    const data = await this.usersService.getRoles();
    return { success: true, data };
  }

  @Get('permissions')
  @Permissions('settings:read')
  @ApiOperation({ summary: 'Get all available permissions' })
  async getPermissions() {
    const data = await this.usersService.getPermissions();
    return { success: true, data };
  }

  @Get(':id')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get a single user by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Permissions('users:write')
  @ApiOperation({ summary: 'Create a new user' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.usersService.create(dto, actor.id);
    return { success: true, data };
  }

  @Patch(':id')
  @Permissions('users:write')
  @ApiOperation({ summary: 'Update a user' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.usersService.update(id, dto, actor.id);
    return { success: true, data };
  }

  @Patch(':id/deactivate')
  @Permissions('users:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a user account' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.usersService.deactivate(id, actor.id);
    return { success: true, ...data };
  }

  @Patch(':id/activate')
  @Permissions('users:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a user account' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.usersService.activate(id, actor.id);
    return { success: true, ...data };
  }
}
