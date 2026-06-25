import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferStatusDto } from './dto/update-offer-status.dto';
import { OfferStatus, ApplicationStage } from '@repo/database';

@Injectable()
export class OffersService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateOfferDto, actorId: string) {
    const application = await this.db.application.findUnique({
      where: { id: dto.applicationId },
      include: {
        candidate: true,
        jobOpening: {
          include: { company: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const offer = await this.db.$transaction(async (tx) => {
      const createdOffer = await tx.offer.create({
        data: {
          applicationId: dto.applicationId,
          salaryAmount: dto.salaryAmount,
          currency: dto.currency,
          benefits: dto.benefits,
          startDate: new Date(dto.startDate),
          expiryDate: new Date(dto.expiryDate),
          status: OfferStatus.DRAFT,
          creatorId: actorId,
        },
      });

      // Update application stage to OFFER if not already
      if (application.stage !== ApplicationStage.OFFER && application.stage !== ApplicationStage.PLACEMENT && application.stage !== ApplicationStage.REJECTED && application.stage !== ApplicationStage.WITHDRAWN) {
        await tx.application.update({
          where: { id: dto.applicationId },
          data: { stage: ApplicationStage.OFFER },
        });

        await tx.applicationStageLog.create({
          data: {
            applicationId: dto.applicationId,
            fromStage: application.stage,
            toStage: ApplicationStage.OFFER,
            userId: actorId,
            note: 'Offer draft generated',
          },
        });
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          resource: 'Offer',
          resourceId: createdOffer.id,
          afterValue: createdOffer as any,
        },
      });

      return createdOffer;
    });

    return this.findOne(offer.id);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    applicationId?: string;
    candidateId?: string;
    status?: OfferStatus;
  }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.applicationId) {
      where.applicationId = query.applicationId;
    }
    if (query.candidateId) {
      where.application = { candidateId: query.candidateId };
    }
    if (query.status) {
      where.status = query.status;
    }

    const [offers, total] = await Promise.all([
      this.db.offer.findMany({
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
          creator: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          approver: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.offer.count({ where }),
    ]);

    return {
      offers,
      meta: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const offer = await this.db.offer.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            candidate: true,
            jobOpening: {
              include: { company: true },
            },
            recruiter: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        creator: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    return offer;
  }

  async updateStatus(id: string, dto: UpdateOfferStatusDto, actorId: string) {
    const offer = await this.findOne(id);
    const beforeValue = { ...offer };
    delete (beforeValue as any).application;
    delete (beforeValue as any).creator;
    delete (beforeValue as any).approver;

    const updated = await this.db.offer.update({
      where: { id },
      data: {
        status: dto.status,
        rejectionReason: dto.rejectionReason ?? null,
      },
    });

    // Create Audit Log
    await this.db.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE',
        resource: 'Offer',
        resourceId: id,
        beforeValue: beforeValue as any,
        afterValue: updated as any,
      },
    });

    return this.findOne(id);
  }

  async approveOffer(id: string, actorId: string) {
    const offer = await this.findOne(id);

    if (offer.status !== OfferStatus.PENDING_APPROVAL && offer.status !== OfferStatus.DRAFT) {
      throw new BadRequestException('Offer must be in DRAFT or PENDING_APPROVAL state to be approved');
    }

    const beforeValue = { ...offer };
    delete (beforeValue as any).application;
    delete (beforeValue as any).creator;
    delete (beforeValue as any).approver;

    const updated = await this.db.offer.update({
      where: { id },
      data: {
        status: OfferStatus.APPROVED,
        approverId: actorId,
      },
    });

    // Create Audit Log
    await this.db.auditLog.create({
      data: {
        userId: actorId,
        action: 'APPROVE',
        resource: 'Offer',
        resourceId: id,
        beforeValue: beforeValue as any,
        afterValue: updated as any,
      },
    });
    
    try {
      await this.db.systemNotification.create({
        data: {
          userId: offer.creatorId,
          type: 'OFFER_APPROVED',
          title: 'Offer Approved',
          message: `The offer for ${offer.application.candidate.firstName} ${offer.application.candidate.lastName} has been approved.`,
          metadata: { offerId: id },
        },
      });
    } catch(err) {
      console.error(err);
    }

    return this.findOne(id);
  }

  async rejectOffer(id: string, reason: string, actorId: string) {
    const offer = await this.findOne(id);

    if (offer.status !== OfferStatus.PENDING_APPROVAL && offer.status !== OfferStatus.DRAFT) {
      throw new BadRequestException('Offer must be in DRAFT or PENDING_APPROVAL state to be rejected');
    }

    const beforeValue = { ...offer };
    delete (beforeValue as any).application;
    delete (beforeValue as any).creator;
    delete (beforeValue as any).approver;

    const updated = await this.db.offer.update({
      where: { id },
      data: {
        status: OfferStatus.REJECTED,
        approverId: actorId,
        rejectionReason: reason,
      },
    });

    await this.db.auditLog.create({
      data: {
        userId: actorId,
        action: 'REJECT',
        resource: 'Offer',
        resourceId: id,
        beforeValue: beforeValue as any,
        afterValue: updated as any,
      },
    });

    try {
      await this.db.systemNotification.create({
        data: {
          userId: offer.creatorId,
          type: 'OFFER_REJECTED',
          title: 'Offer Rejected',
          message: `The offer for ${offer.application.candidate.firstName} ${offer.application.candidate.lastName} was rejected. Reason: ${reason}`,
          metadata: { offerId: id },
        },
      });
    } catch(err) {
      console.error(err);
    }

    return this.findOne(id);
  }
}
