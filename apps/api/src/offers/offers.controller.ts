import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferStatusDto } from './dto/update-offer-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OfferStatus } from '@repo/database';

@ApiTags('Offers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  @Permissions('offers:write')
  @ApiOperation({ summary: 'Create a new offer' })
  async create(
    @Body() dto: CreateOfferDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.offersService.create(dto, actor.id);
    return { success: true, data };
  }

  @Get()
  @Permissions('offers:read')
  @ApiOperation({ summary: 'Find all offers with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'applicationId', required: false, type: String })
  @ApiQuery({ name: 'candidateId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: OfferStatus })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('applicationId') applicationId?: string,
    @Query('candidateId') candidateId?: string,
    @Query('status') status?: OfferStatus,
  ) {
    const result = await this.offersService.findAll({
      page,
      limit,
      applicationId,
      candidateId,
      status,
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @Permissions('offers:read')
  @ApiOperation({ summary: 'Get details of a specific offer' })
  async findOne(@Param('id') id: string) {
    const data = await this.offersService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id/status')
  @Permissions('offers:write')
  @ApiOperation({ summary: 'Update offer status (e.g. SENT, ACCEPTED, REJECTED)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOfferStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.offersService.updateStatus(id, dto, actor.id);
    return { success: true, data };
  }

  @Post(':id/approve')
  @Permissions('offers:approve')
  @ApiOperation({ summary: 'Approve an offer' })
  async approveOffer(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.offersService.approveOffer(id, actor.id);
    return { success: true, data };
  }

  @Post(':id/reject')
  @Permissions('offers:approve')
  @ApiOperation({ summary: 'Reject an offer from approval' })
  async rejectOffer(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!reason || reason.trim() === '') {
      throw new BadRequestException('Rejection reason is required');
    }
    const data = await this.offersService.rejectOffer(id, reason, actor.id);
    return { success: true, data };
  }
}
