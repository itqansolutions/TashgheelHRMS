import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateReplacementDto } from './dto/create-replacement.dto';
import { UpdateReplacementDto } from './dto/update-replacement.dto';
import { ReplacementStatus, PlacementStatus, GuaranteeStatus } from '@repo/database';

@Injectable()
export class ReplacementsService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateReplacementDto, actorId: string) {
    const placement = await this.db.placement.findUnique({
      where: { id: dto.placementId },
    });

    if (!placement) {
      throw new NotFoundException('Placement not found');
    }

    if (placement.guaranteeStatus !== GuaranteeStatus.ACTIVE) {
      throw new BadRequestException('Placement guarantee is not active or has expired');
    }

    const replacement = await this.db.$transaction(async (tx) => {
      const createdReplacement = await tx.replacement.create({
        data: {
          placementId: dto.placementId,
          reason: dto.reason,
          detailNotes: dto.detailNotes,
          status: ReplacementStatus.REQUESTED,
        },
      });

      await tx.placement.update({
        where: { id: dto.placementId },
        data: {
          status: PlacementStatus.REPLACED,
          guaranteeStatus: GuaranteeStatus.VOIDED,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          resource: 'Replacement',
          resourceId: createdReplacement.id,
          afterValue: createdReplacement as any,
        },
      });

      return createdReplacement;
    });

    return this.findOne(replacement.id);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: ReplacementStatus;
    placementId?: string;
  }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.placementId) {
      where.placementId = query.placementId;
    }

    const [replacements, total] = await Promise.all([
      this.db.replacement.findMany({
        where,
        skip,
        take: limit,
        include: {
          placement: {
            include: {
              application: {
                include: {
                  candidate: true,
                  jobOpening: {
                    include: { company: true },
                  },
                },
              },
            },
          },
          replacementCandidate: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.replacement.count({ where }),
    ]);

    return {
      replacements,
      meta: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const replacement = await this.db.replacement.findUnique({
      where: { id },
      include: {
        placement: {
          include: {
            application: {
              include: {
                candidate: true,
                jobOpening: {
                  include: { company: true },
                },
              },
            },
          },
        },
        replacementCandidate: true,
      },
    });

    if (!replacement) {
      throw new NotFoundException('Replacement not found');
    }

    return replacement;
  }

  async update(id: string, dto: UpdateReplacementDto, actorId: string) {
    const replacement = await this.findOne(id);
    const beforeValue = { ...replacement };
    delete (beforeValue as any).placement;
    delete (beforeValue as any).replacementCandidate;

    const updateData: any = { ...dto };
    if (dto.status === ReplacementStatus.COMPLETED && replacement.status !== ReplacementStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    const updated = await this.db.replacement.update({
      where: { id },
      data: updateData,
    });

    await this.db.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE',
        resource: 'Replacement',
        resourceId: id,
        beforeValue: beforeValue as any,
        afterValue: updated as any,
      },
    });

    return this.findOne(id);
  }
}
