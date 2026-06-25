import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { UpdateRequisitionDto } from './dto/update-requisition.dto';
import { JobRequisitionStatus, JobOpeningStatus } from '@repo/database';

@Injectable()
export class JobsService {
  constructor(private readonly db: DatabaseService) {}

  // --- REQUISITIONS ---

  async createRequisition(dto: CreateRequisitionDto, actorId: string) {
    const company = await this.db.company.findFirst({
      where: { id: dto.companyId, deletedAt: null },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.db.$transaction(async (tx) => {
      const requisition = await tx.jobRequisition.create({
        data: {
          title: dto.title,
          department: dto.department,
          companyId: dto.companyId,
          location: dto.location,
          type: dto.type,
          salaryMin: dto.salaryMin,
          salaryMax: dto.salaryMax,
          descriptionEn: dto.descriptionEn,
          descriptionAr: dto.descriptionAr,
          requirementsEn: dto.requirementsEn,
          requirementsAr: dto.requirementsAr,
          deadline: dto.deadline,
          status: dto.status ?? 'DRAFT',
          creatorId: actorId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          resource: 'JobRequisition',
          resourceId: requisition.id,
          afterValue: requisition as any,
        },
      });

      return requisition;
    });
  }

  async findAllRequisitions(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    companyId?: string;
  }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    const [requisitions, total] = await Promise.all([
      this.db.jobRequisition.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: { select: { id: true, name: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
          approver: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.jobRequisition.count({ where }),
    ]);

    return {
      requisitions,
      meta: { total, page, pages: Math.ceil(total / limit) },
    };
  }

  async findOneRequisition(id: string) {
    const requisition = await this.db.jobRequisition.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
        jobOpening: true,
      },
    });

    if (!requisition) {
      throw new NotFoundException('Job Requisition not found');
    }

    return requisition;
  }

  async updateRequisition(id: string, dto: UpdateRequisitionDto, actorId: string) {
    const requisition = await this.findOneRequisition(id);

    if (requisition.status === 'APPROVED') {
      throw new ForbiddenException('Cannot edit an approved job requisition');
    }

    return this.db.$transaction(async (tx) => {
      const updated = await tx.jobRequisition.update({
        where: { id },
        data: dto,
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'UPDATE',
          resource: 'JobRequisition',
          resourceId: id,
          beforeValue: requisition as any,
          afterValue: updated as any,
        },
      });

      return updated;
    });
  }

  async approveRequisition(id: string, actorId: string) {
    const requisition = await this.findOneRequisition(id);

    if (requisition.status === 'APPROVED') {
      throw new BadRequestException('Job Requisition is already approved');
    }

    return this.db.$transaction(async (tx) => {
      // 1. Update requisition status
      const updatedRequisition = await tx.jobRequisition.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: actorId,
          rejectionReason: null,
        },
      });

      // 2. Auto-create Job Opening
      const jobOpening = await tx.jobOpening.create({
        data: {
          requisitionId: id,
          companyId: requisition.companyId,
          title: requisition.title,
          status: 'OPEN',
          openedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'APPROVE',
          resource: 'JobRequisition',
          resourceId: id,
          beforeValue: requisition as any,
          afterValue: { updatedRequisition, jobOpening } as any,
        },
      });

      return { requisition: updatedRequisition, jobOpening };
    });
  }

  async rejectRequisition(id: string, reason: string, actorId: string) {
    const requisition = await this.findOneRequisition(id);

    if (requisition.status === 'APPROVED') {
      throw new BadRequestException('Cannot reject an already approved job requisition');
    }

    return this.db.$transaction(async (tx) => {
      const updatedRequisition = await tx.jobRequisition.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approverId: actorId,
          rejectionReason: reason,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'REJECT',
          resource: 'JobRequisition',
          resourceId: id,
          beforeValue: requisition as any,
          afterValue: updatedRequisition as any,
        },
      });

      return updatedRequisition;
    });
  }

  // --- JOB OPENINGS ---

  async findAllOpenings(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    companyId?: string;
  }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    const [openings, total] = await Promise.all([
      this.db.jobOpening.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: { select: { id: true, name: true } },
          requisition: {
            select: {
              id: true,
              department: true,
              location: true,
              type: true,
              salaryMin: true,
              salaryMax: true,
              descriptionEn: true,
              descriptionAr: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.jobOpening.count({ where }),
    ]);

    return {
      openings,
      meta: { total, page, pages: Math.ceil(total / limit) },
    };
  }

  async findOneOpening(id: string) {
    const opening = await this.db.jobOpening.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        requisition: true,
        applications: {
          include: {
            candidate: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (!opening) {
      throw new NotFoundException('Job Opening not found');
    }

    return opening;
  }

  async updateOpeningStatus(id: string, status: JobOpeningStatus, actorId: string) {
    const opening = await this.findOneOpening(id);

    const closedStatuses: JobOpeningStatus[] = ['CLOSED', 'FILLED'];
    const closedAt = closedStatuses.includes(status) ? new Date() : null;

    return this.db.$transaction(async (tx) => {
      const updated = await tx.jobOpening.update({
        where: { id },
        data: {
          status,
          closedAt,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'UPDATE_STATUS',
          resource: 'JobOpening',
          resourceId: id,
          beforeValue: { status: opening.status, closedAt: opening.closedAt },
          afterValue: { status: updated.status, closedAt: updated.closedAt } as any,
        },
      });

      return updated;
    });
  }
}
