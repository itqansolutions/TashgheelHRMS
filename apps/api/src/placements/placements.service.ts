import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreatePlacementDto } from './dto/create-placement.dto';
import { UpdatePlacementDto } from './dto/update-placement.dto';
import { GuaranteeStatus, PlacementStatus, ApplicationStage } from '@repo/database';

@Injectable()
export class PlacementsService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreatePlacementDto, actorId: string) {
    const offer = await this.db.offer.findUnique({
      where: { id: dto.offerId },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== 'ACCEPTED') {
      throw new BadRequestException('Placement can only be created for an accepted offer');
    }

    const existingPlacement = await this.db.placement.findUnique({
      where: { offerId: dto.offerId },
    });

    if (existingPlacement) {
      throw new BadRequestException('Placement already exists for this offer');
    }

    const startDate = new Date(dto.startDate);
    const guaranteeDays = dto.guaranteeDays ?? 90;
    const guaranteeEndDate = new Date(startDate);
    guaranteeEndDate.setDate(guaranteeEndDate.getDate() + guaranteeDays);

    const placement = await this.db.$transaction(async (tx) => {
      const createdPlacement = await tx.placement.create({
        data: {
          offerId: dto.offerId,
          applicationId: dto.applicationId,
          startDate,
          feeAmount: dto.feeAmount,
          feeType: dto.feeType,
          guaranteeDays,
          guaranteeEndDate,
          guaranteeStatus: GuaranteeStatus.ACTIVE,
          status: PlacementStatus.GUARANTEE_PERIOD,
        },
      });

      // Update application stage to PLACEMENT
      await tx.application.update({
        where: { id: dto.applicationId },
        data: { stage: ApplicationStage.PLACEMENT },
      });

      await tx.applicationStageLog.create({
        data: {
          applicationId: dto.applicationId,
          fromStage: ApplicationStage.OFFER, // Assuming it came from OFFER
          toStage: ApplicationStage.PLACEMENT,
          userId: actorId,
          note: 'Placement generated from accepted offer',
        },
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          resource: 'Placement',
          resourceId: createdPlacement.id,
          afterValue: createdPlacement as any,
        },
      });

      return createdPlacement;
    });

    return this.findOne(placement.id);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: PlacementStatus;
    guaranteeStatus?: GuaranteeStatus;
    companyId?: string;
  }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.guaranteeStatus) {
      where.guaranteeStatus = query.guaranteeStatus;
    }
    if (query.companyId) {
      where.application = {
        jobOpening: {
          companyId: query.companyId,
        },
      };
    }

    const [placements, total] = await Promise.all([
      this.db.placement.findMany({
        where,
        skip,
        take: limit,
        include: {
          application: {
            include: {
              candidate: true,
              jobOpening: {
                include: { company: true },
              },
            },
          },
          offer: {
            select: { id: true, salaryAmount: true, currency: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.placement.count({ where }),
    ]);

    return {
      placements,
      meta: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const placement = await this.db.placement.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            candidate: true,
            jobOpening: {
              include: { company: true },
            },
          },
        },
        offer: true,
        replacements: true,
        invoices: true,
      },
    });

    if (!placement) {
      throw new NotFoundException('Placement not found');
    }

    return placement;
  }

  async update(id: string, dto: UpdatePlacementDto, actorId: string) {
    const placement = await this.findOne(id);
    const beforeValue = { ...placement };
    delete (beforeValue as any).application;
    delete (beforeValue as any).offer;
    delete (beforeValue as any).replacements;
    delete (beforeValue as any).invoices;

    const updated = await this.db.placement.update({
      where: { id },
      data: dto,
    });

    await this.db.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE',
        resource: 'Placement',
        resourceId: id,
        beforeValue: beforeValue as any,
        afterValue: updated as any,
      },
    });

    return this.findOne(id);
  }
}
