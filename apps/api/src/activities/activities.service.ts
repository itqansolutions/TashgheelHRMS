import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateActivityDto, actorId: string) {
    // If companyId is provided, verify it exists
    if (dto.companyId) {
      const company = await this.db.company.findFirst({
        where: { id: dto.companyId, deletedAt: null },
      });
      if (!company) throw new NotFoundException('Company not found');
    }

    // If contactId is provided, verify it exists
    if (dto.contactId) {
      const contact = await this.db.contact.findUnique({
        where: { id: dto.contactId },
      });
      if (!contact) throw new NotFoundException('Contact not found');
    }

    // If candidateId is provided, verify it exists
    if (dto.candidateId) {
      const candidate = await this.db.candidate.findFirst({
        where: { id: dto.candidateId, deletedAt: null },
      });
      if (!candidate) throw new NotFoundException('Candidate not found');
    }

    return this.db.$transaction(async (tx) => {
      const activity = await tx.cRMActivity.create({
        data: {
          type: dto.type,
          subject: dto.subject,
          content: dto.content,
          userId: actorId,
          companyId: dto.companyId,
          contactId: dto.contactId,
          candidateId: dto.candidateId,
          dueDate: dto.dueDate,
          isCompleted: dto.isCompleted ?? false,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          resource: 'CRMActivity',
          resourceId: activity.id,
          afterValue: activity as any,
        },
      });

      return activity;
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    companyId?: string;
    contactId?: string;
    candidateId?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.contactId) {
      where.contactId = query.contactId;
    }

    if (query.candidateId) {
      where.candidateId = query.candidateId;
    }

    const [activities, total] = await Promise.all([
      this.db.cRMActivity.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          contact: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.cRMActivity.count({ where }),
    ]);

    return {
      activities,
      meta: { total, page, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const activity = await this.db.cRMActivity.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    return activity;
  }

  async update(id: string, dto: UpdateActivityDto, actorId: string) {
    const activity = await this.findOne(id);

    return this.db.$transaction(async (tx) => {
      const updated = await tx.cRMActivity.update({
        where: { id },
        data: dto,
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'UPDATE',
          resource: 'CRMActivity',
          resourceId: id,
          beforeValue: activity as any,
          afterValue: updated as any,
        },
      });

      return updated;
    });
  }

  async remove(id: string, actorId: string) {
    const activity = await this.findOne(id);

    return this.db.$transaction(async (tx) => {
      await tx.cRMActivity.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'DELETE',
          resource: 'CRMActivity',
          resourceId: id,
          beforeValue: activity as any,
        },
      });

      return { success: true };
    });
  }
}
