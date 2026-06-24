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
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @Permissions('companies:write')
  @ApiOperation({ summary: 'Create a new client contact' })
  async create(
    @Body() dto: CreateContactDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.contactsService.create(dto, actor.id);
    return { success: true, data };
  }

  @Get()
  @Permissions('companies:read')
  @ApiOperation({ summary: 'Get all contacts (paginated + filtered)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('companyId') companyId?: string,
  ) {
    const result = await this.contactsService.findAll({
      page,
      limit,
      search,
      companyId,
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @Permissions('companies:read')
  @ApiOperation({ summary: 'Get details of a specific contact' })
  async findOne(@Param('id') id: string) {
    const data = await this.contactsService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  @Permissions('companies:write')
  @ApiOperation({ summary: 'Update a specific contact' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.contactsService.update(id, dto, actor.id);
    return { success: true, data };
  }

  @Delete(':id')
  @Permissions('companies:write')
  @ApiOperation({ summary: 'Delete a specific contact' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.contactsService.remove(id, actor.id);
    return result;
  }
}
