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
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { CreatePoolDto } from './dto/create-pool.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { FileInterceptor } from '@nestjs/platform-express';
import { CandidateDocumentType } from '@repo/database';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';

@ApiTags('Candidates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post()
  @Permissions('candidates:write')
  @ApiOperation({ summary: 'Register a new candidate profile' })
  async create(
    @Body() dto: CreateCandidateDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.candidatesService.create(dto, actor.id);
    return { success: true, data };
  }

  @Get()
  @Permissions('candidates:read')
  @ApiOperation({ summary: 'Get all candidates (paginated + filtered)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'skills', required: false, type: String, description: 'Comma-separated skill names' })
  @ApiQuery({ name: 'location', required: false, type: String })
  @ApiQuery({ name: 'availability', required: false, type: String })
  @ApiQuery({ name: 'expectedSalaryMax', required: false, type: Number })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('skills') skills?: string,
    @Query('location') location?: string,
    @Query('availability') availability?: string,
    @Query('expectedSalaryMax') expectedSalaryMax?: number,
  ) {
    const result = await this.candidatesService.findAll({
      page,
      limit,
      search,
      skills,
      location,
      availability,
      expectedSalaryMax,
    });
    return { success: true, ...result };
  }

  // --- CANDIDATE POOLS ---

  @Post('pools')
  @Permissions('candidates:write')
  @ApiOperation({ summary: 'Create a candidate pool' })
  async createPool(
    @Body() dto: CreatePoolDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.candidatesService.createPool(dto, actor.id);
    return { success: true, data };
  }

  @Get('pools')
  @Permissions('candidates:read')
  @ApiOperation({ summary: 'Get all candidate pools' })
  async findAllPools() {
    const data = await this.candidatesService.findAllPools();
    return { success: true, data };
  }

  @Get('pools/:id')
  @Permissions('candidates:read')
  @ApiOperation({ summary: 'Get details of a specific candidate pool including members' })
  async findOnePool(@Param('id') id: string) {
    const data = await this.candidatesService.findOnePool(id);
    return { success: true, data };
  }

  @Post('pools/:id/members')
  @Permissions('candidates:write')
  @ApiOperation({ summary: 'Add a candidate to a pool' })
  async addPoolMember(
    @Param('id') poolId: string,
    @Body('candidateId') candidateId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!candidateId) throw new BadRequestException('candidateId is required');
    const result = await this.candidatesService.addPoolMember(poolId, candidateId, actor.id);
    return result;
  }

  @Delete('pools/:id/members/:candidateId')
  @Permissions('candidates:write')
  @ApiOperation({ summary: 'Remove a candidate from a pool' })
  async removePoolMember(
    @Param('id') poolId: string,
    @Param('candidateId') candidateId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.candidatesService.removePoolMember(poolId, candidateId, actor.id);
    return result;
  }

  // --- CANDIDATE PROFILE DETAILS ---

  @Get(':id')
  @Permissions('candidates:read')
  @ApiOperation({ summary: 'Get details of a specific candidate' })
  async findOne(@Param('id') id: string) {
    const data = await this.candidatesService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  @Permissions('candidates:write')
  @ApiOperation({ summary: 'Update a candidate profile' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.candidatesService.update(id, dto, actor.id);
    return { success: true, data };
  }

  @Delete(':id')
  @Permissions('candidates:write')
  @ApiOperation({ summary: 'Soft delete a candidate profile' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.candidatesService.remove(id, actor.id);
    return result;
  }

  // --- CANDIDATE DOCUMENTS ---

  @Post(':id/documents')
  @Permissions('candidates:write')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document (resume CV/certificates) for a candidate' })
  async uploadDocument(
    @Param('id') candidateId: string,
    @Body('type') type: CandidateDocumentType,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('A file must be uploaded');
    }
    const data = await this.candidatesService.uploadDocument(candidateId, file, type, actor.id);
    return { success: true, data };
  }

  @Delete('documents/:id')
  @Permissions('candidates:write')
  @ApiOperation({ summary: 'Remove a candidate document file' })
  async removeDocument(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.candidatesService.removeDocument(id, actor.id);
    return result;
  }

  @Post('parse-cv')
  @Permissions('candidates:write')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Parse a CV file, create candidate profile, upload CV document, preventing duplication' })
  async parseAndCreate(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('A CV file must be provided');
    }
    const result = await this.candidatesService.parseAndCreateFromCv(file, actor.id);
    return { success: true, ...result };
  }
}
