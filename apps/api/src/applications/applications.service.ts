import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { TransitionStageDto } from './dto/transition-stage.dto';
import { ApplicationStage } from '@repo/database';

@Injectable()
export class ApplicationsService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateApplicationDto, actorId: string) {
    // 1. Verify candidate exists
    const candidate = await this.db.candidate.findFirst({
      where: { id: dto.candidateId, deletedAt: null },
    });
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    // 2. Verify job opening exists
    const jobOpening = await this.db.jobOpening.findUnique({
      where: { id: dto.jobOpeningId },
    });
    if (!jobOpening) {
      throw new NotFoundException('Job Opening not found');
    }

    // 3. Check duplicate application
    const existing = await this.db.application.findUnique({
      where: {
        candidateId_jobOpeningId: {
          candidateId: dto.candidateId,
          jobOpeningId: dto.jobOpeningId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('This candidate has already applied for this job opening');
    }

    const recruiterId = dto.recruiterId ?? actorId;
    const initialStage = dto.stage ?? 'NEW_APPLICATION';

    return this.db.$transaction(async (tx) => {
      // 4. Create application
      const application = await tx.application.create({
        data: {
          candidateId: dto.candidateId,
          jobOpeningId: dto.jobOpeningId,
          recruiterId,
          stage: initialStage as ApplicationStage,
        },
      });

      // 5. Create initial stage log
      await tx.applicationStageLog.create({
        data: {
          applicationId: application.id,
          fromStage: null,
          toStage: initialStage as ApplicationStage,
          note: 'Initial application registration',
          userId: actorId,
        },
      });

      // 6. Log audit event
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          resource: 'Application',
          resourceId: application.id,
          afterValue: application as any,
        },
      });

      return application;
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    candidateId?: string;
    jobOpeningId?: string;
    recruiterId?: string;
    stage?: string;
  }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.candidateId) where.candidateId = query.candidateId;
    if (query.jobOpeningId) where.jobOpeningId = query.jobOpeningId;
    if (query.recruiterId) where.recruiterId = query.recruiterId;
    if (query.stage) where.stage = query.stage as ApplicationStage;

    const [applications, total] = await Promise.all([
      this.db.application.findMany({
        where,
        skip,
        take: limit,
        include: {
          candidate: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          jobOpening: { select: { id: true, title: true, company: { select: { name: true } } } },
          recruiter: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.db.application.count({ where }),
    ]);

    return {
      applications,
      meta: { total, page, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const application = await this.db.application.findUnique({
      where: { id },
      include: {
        candidate: true,
        jobOpening: {
          include: {
            company: { select: { id: true, name: true } },
            requisition: { select: { id: true, department: true, location: true, type: true } },
          },
        },
        recruiter: { select: { id: true, firstName: true, lastName: true } },
        stageLogs: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        interviews: {
          orderBy: { scheduledAt: 'desc' },
        },
        offers: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async transitionStage(id: string, dto: TransitionStageDto, actorId: string) {
    const application = await this.findOne(id);

    if (application.stage === dto.stage) {
      return application;
    }

    return this.db.$transaction(async (tx) => {
      // 1. Update application stage
      const updated = await tx.application.update({
        where: { id },
        data: { stage: dto.stage },
      });

      // 2. Create stage transition log
      await tx.applicationStageLog.create({
        data: {
          applicationId: id,
          fromStage: application.stage,
          toStage: dto.stage,
          note: dto.note ?? 'Pipeline stage updated',
          userId: actorId,
        },
      });

      // 3. Log audit event
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'TRANSITION_STAGE',
          resource: 'Application',
          resourceId: id,
          beforeValue: { stage: application.stage },
          afterValue: { stage: dto.stage, note: dto.note } as any,
        },
      });

      return updated;
    });
  }

  async getPipelineSummary(jobOpeningId: string) {
    // Check job opening exists
    const jobOpening = await this.db.jobOpening.findUnique({
      where: { id: jobOpeningId },
    });
    if (!jobOpening) {
      throw new NotFoundException('Job Opening not found');
    }

    // Fetch all applications for the job opening
    const applications = await this.db.application.findMany({
      where: { jobOpeningId },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            currentLocation: true,
            availability: true,
          },
        },
        recruiter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return applications;
  }

  async remove(id: string, actorId: string) {
    const application = await this.findOne(id);

    return this.db.$transaction(async (tx) => {
      await tx.application.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'DELETE',
          resource: 'Application',
          resourceId: id,
          beforeValue: application as any,
        },
      });

      return { success: true };
    });
  }
}
