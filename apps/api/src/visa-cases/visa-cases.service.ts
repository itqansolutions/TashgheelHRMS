import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { VisaCaseStatus } from '@repo/database';

@Injectable()
export class VisaCasesService {
  constructor(private readonly db: DatabaseService) {}

  async create(data: { placementId: string; workflowId?: string }, actorId: string) {
    const placement = await this.db.placement.findUnique({
      where: { id: data.placementId },
      include: { application: { include: { candidate: true, jobOpening: true } } },
    });

    if (!placement) throw new NotFoundException('Placement not found');

    // Check if visa case already exists
    const existing = await this.db.visaCase.findUnique({ where: { placementId: data.placementId } });
    if (existing) throw new BadRequestException('Visa Case already exists for this placement');

    // Identify workflow to attach
    let workflowId = data.workflowId;
    let initialStageId = null;

    if (workflowId) {
      const workflow = await this.db.visaWorkflow.findUnique({
        where: { id: workflowId },
        include: { stages: { orderBy: { order: 'asc' }, take: 1 } },
      });
      if (workflow && workflow.stages.length > 0) {
        initialStageId = workflow.stages[0].id;
      }
    }

    const visaCase = await this.db.visaCase.create({
      data: {
        placementId: data.placementId,
        candidateId: placement.application.candidateId,
        jobId: placement.application.jobOpeningId,
        companyId: placement.application.jobOpening.companyId,
        workflowId: workflowId,
        currentStageId: initialStageId,
        coordinatorId: actorId, // default assign to creator
        status: 'PENDING',
      },
    });

    return this.findOne(visaCase.id);
  }

  async findAll(query: { workflowId?: string; status?: VisaCaseStatus }) {
    const where: any = {};
    if (query.workflowId) where.workflowId = query.workflowId;
    if (query.status) where.status = query.status;

    return this.db.visaCase.findMany({
      where,
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, availability: true, email: true } },
        jobOpening: { select: { id: true, title: true, company: true } },
        coordinator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        currentStage: true,
        workflow: true,
        documents: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const vc = await this.db.visaCase.findUnique({
      where: { id },
      include: {
        candidate: true,
        jobOpening: { include: { company: true } },
        coordinator: { select: { id: true, firstName: true, lastName: true } },
        currentStage: true,
        workflow: { include: { stages: { orderBy: { order: 'asc' } } } },
        documents: true,
        stageLogs: { include: { stage: true, completedBy: { select: { firstName: true, lastName: true } } }, orderBy: { startedAt: 'desc' } },
      },
    });
    if (!vc) throw new NotFoundException('Visa case not found');
    return vc;
  }

  async updateStage(id: string, stageId: string, actorId: string) {
    const vc = await this.findOne(id);
    
    // Log previous stage as completed
    if (vc.currentStageId && vc.currentStageId !== stageId) {
       await this.db.visaStageLog.create({
         data: {
           visaCaseId: id,
           stageId: vc.currentStageId,
           status: 'COMPLETED',
           completedById: actorId,
           completedAt: new Date(),
         }
       });
    }

    // Update current stage
    const updated = await this.db.visaCase.update({
      where: { id },
      data: {
        currentStageId: stageId,
        status: 'IN_PROGRESS',
      },
    });

    return updated;
  }
}
