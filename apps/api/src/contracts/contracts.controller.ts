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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';

@ApiTags('Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @Permissions('companies:write')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Register a new contract and upload its PDF/DOCX file' })
  async create(
    @Body() dto: CreateContractDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('A contract file must be uploaded');
    }
    const data = await this.contractsService.create(dto, file, actor.id);
    return { success: true, data };
  }

  @Get()
  @Permissions('companies:read')
  @ApiOperation({ summary: 'Get all contracts (paginated + filtered)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.contractsService.findAll({
      page,
      limit,
      companyId,
      status,
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @Permissions('companies:read')
  @ApiOperation({ summary: 'Get details of a specific contract' })
  async findOne(@Param('id') id: string) {
    const data = await this.contractsService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  @Permissions('companies:write')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a contract and optionally upload a new file' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.contractsService.update(id, dto, file, actor.id);
    return { success: true, data };
  }

  @Delete(':id')
  @Permissions('companies:write')
  @ApiOperation({ summary: 'Delete a specific contract' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.contractsService.remove(id, actor.id);
    return result;
  }
}
