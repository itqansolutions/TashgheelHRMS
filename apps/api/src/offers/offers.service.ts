import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferStatusDto } from './dto/update-offer-status.dto';
import { OfferStatus, ApplicationStage, GuaranteeStatus, PlacementStatus } from '@repo/database';
import { NotificationsService } from '../notifications/notifications.service';
import { InvoicesService } from '../finance/invoices.service';

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly invoicesService: InvoicesService,
  ) {}

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
      if (
        application.stage !== ApplicationStage.OFFER &&
        application.stage !== ApplicationStage.PLACEMENT &&
        application.stage !== ApplicationStage.REJECTED &&
        application.stage !== ApplicationStage.WITHDRAWN
      ) {
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

    // ====================================================
    // EVENT: OFFER_ACCEPTED — Trigger automated workflows
    // ====================================================
    if (dto.status === OfferStatus.ACCEPTED) {
      this.handleOfferAccepted(id, offer, actorId).catch((err) =>
        this.logger.error(`[EVENT:OFFER_ACCEPTED] Failed for offer ${id}`, err),
      );
    }

    return this.findOne(id);
  }

  /**
   * EVENT HANDLER: Offer Accepted
   * Automatically:
   * 1. Creates a Placement record
   * 2. Auto-creates an Invoice linked to the Placement (Net 30, 15% recruitment fee, 15% VAT)
   * 3. Auto-creates a Visa Case (inside placement transaction)
   * 4. Sends real-time WebSocket notifications to Recruiter & Finance team
   */
  private async handleOfferAccepted(offerId: string, offer: any, actorId: string) {
    this.logger.log(`[EVENT:OFFER_ACCEPTED] Processing offer ${offerId}`);

    try {
      const candidate = offer.application.candidate;
      const jobOpening = offer.application.jobOpening;
      const company = jobOpening.company;

      // === 1. Auto-create Placement ===
      const startDate = offer.startDate ?? new Date();
      const guaranteeDays = 90;
      const guaranteeEndDate = new Date(startDate);
      guaranteeEndDate.setDate(guaranteeEndDate.getDate() + guaranteeDays);

      const existingPlacement = await this.db.placement.findUnique({
        where: { offerId },
      });

      let placement: any = existingPlacement;

      if (!existingPlacement) {
        placement = await this.db.$transaction(async (tx) => {
          const created = await tx.placement.create({
            data: {
              offerId,
              applicationId: offer.applicationId,
              startDate: new Date(startDate),
              feeAmount: Number(offer.salaryAmount) * 0.15, // Default 15% recruitment fee
              feeType: 'PERCENTAGE',
              guaranteeDays,
              guaranteeEndDate,
              guaranteeStatus: GuaranteeStatus.ACTIVE,
              status: PlacementStatus.GUARANTEE_PERIOD,
            },
          });

          // Update application stage to PLACEMENT
          await tx.application.update({
            where: { id: offer.applicationId },
            data: { stage: ApplicationStage.PLACEMENT },
          });

          await tx.applicationStageLog.create({
            data: {
              applicationId: offer.applicationId,
              fromStage: ApplicationStage.OFFER,
              toStage: ApplicationStage.PLACEMENT,
              userId: actorId,
              note: 'Auto-placed: Offer accepted by candidate',
            },
          });

          // Auto-create Visa Case
          await tx.visaCase.create({
            data: {
              placementId: created.id,
              candidateId: offer.application.candidateId,
              jobId: offer.application.jobOpeningId,
              companyId: company.id,
              status: 'PENDING',
            },
          });

          await tx.auditLog.create({
            data: {
              userId: actorId,
              action: 'AUTO_CREATE',
              resource: 'Placement',
              resourceId: created.id,
              afterValue: created as any,
            },
          });

          return created;
        });

        this.logger.log(`[EVENT:OFFER_ACCEPTED] Placement created: ${placement.id}`);
      } else {
        this.logger.log(`[EVENT:OFFER_ACCEPTED] Placement already exists: ${existingPlacement.id}`);
      }

      // === 2. Auto-create Invoice (Net 30, 15% recruitment fee + 15% VAT) ===
      try {
        const feeAmount = Number(offer.salaryAmount) * 0.15;
        const issueDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Net 30

        await this.invoicesService.create(
          {
            companyId: company.id,
            placementId: placement.id,
            issueDate: issueDate.toISOString(),
            dueDate: dueDate.toISOString(),
            vatRate: 15,
            items: [
              {
                description: `Recruitment Service Fee — ${candidate.firstName} ${candidate.lastName} (${jobOpening.title})`,
                quantity: 1,
                unitPrice: feeAmount,
              },
            ],
          },
          actorId,
        );
        this.logger.log(`[EVENT:OFFER_ACCEPTED] Invoice auto-created for placement ${placement.id}`);
      } catch (invoiceErr) {
        this.logger.error(`[EVENT:OFFER_ACCEPTED] Invoice creation failed (non-critical)`, invoiceErr);
      }

      // === 3. Send Real-time Notifications ===
      const candidateName = `${candidate.firstName} ${candidate.lastName}`;

      // Notify the recruiter
      if (offer.application.recruiterId) {
        await this.notificationsService.createNotification({
          userId: offer.application.recruiterId,
          type: 'OFFER_ACCEPTED',
          title: '🎉 Offer Accepted!',
          message: `${candidateName} accepted the offer for ${jobOpening.title} at ${company.name}. A placement and invoice have been automatically created.`,
          metadata: { offerId, placementId: placement.id },
        }).catch(() => {});
      }

      // Notify Finance team users (Admin + Finance roles)
      const financeUsers = await this.db.user.findMany({
        where: {
          userRoles: {
            some: {
              role: {
                name: { in: ['Finance', 'Admin', 'finance', 'admin'] },
              },
            },
          },
          status: 'ACTIVE',
        },
        select: { id: true },
        take: 10,
      });

      for (const finUser of financeUsers) {
        await this.notificationsService.createNotification({
          userId: finUser.id,
          type: 'INVOICE_GENERATED',
          title: '📄 New Invoice Generated',
          message: `An invoice has been automatically generated for the placement of ${candidateName} at ${company.name}. Please review and send to client.`,
          metadata: { offerId, placementId: placement.id },
        }).catch(() => {});
      }

      this.logger.log(`[EVENT:OFFER_ACCEPTED] All automations completed for offer ${offerId}`);
    } catch (err) {
      this.logger.error(`[EVENT:OFFER_ACCEPTED] Critical error for offer ${offerId}`, err);
      throw err;
    }
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

    // Use NotificationsService for proper WebSocket push (previously used raw DB create, bypassing WS)
    await this.notificationsService.createNotification({
      userId: offer.creatorId,
      type: 'OFFER_APPROVED',
      title: 'Offer Approved ✅',
      message: `The offer for ${offer.application.candidate.firstName} ${offer.application.candidate.lastName} has been approved and is ready to be sent to the candidate.`,
      metadata: { offerId: id },
    }).catch(() => {});

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

    // Use NotificationsService for proper WebSocket push (previously used raw DB create, bypassing WS)
    await this.notificationsService.createNotification({
      userId: offer.creatorId,
      type: 'OFFER_REJECTED',
      title: 'Offer Rejected ❌',
      message: `The offer for ${offer.application.candidate.firstName} ${offer.application.candidate.lastName} was rejected. Reason: ${reason}`,
      metadata: { offerId: id },
    }).catch(() => {});

    return this.findOne(id);
  }
}
