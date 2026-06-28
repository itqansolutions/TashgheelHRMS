import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class VisaWorkflowsService {
  constructor(private readonly db: DatabaseService) {}

  async create(data: { country: string; description?: string; stages: { name: string; order: number; checklistItems?: any }[] }) {
    return this.db.visaWorkflow.create({
      data: {
        country: data.country,
        description: data.description,
        stages: {
          create: data.stages.map((s) => ({
            name: s.name,
            order: s.order,
            checklistItems: s.checklistItems ?? [],
          })),
        },
      },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
  }

  async findAll() {
    return this.db.visaWorkflow.findMany({
      include: { stages: { orderBy: { order: 'asc' } } },
      orderBy: { country: 'asc' },
    });
  }

  async findOne(id: string) {
    const workflow = await this.db.visaWorkflow.findUnique({
      where: { id },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
    if (!workflow) throw new NotFoundException('Visa Workflow not found');
    return workflow;
  }

  async update(id: string, data: { country?: string; description?: string; stages?: { id?: string; name: string; order: number; checklistItems?: any }[] }) {
    // Basic update logic for workflow info
    return this.db.visaWorkflow.update({
      where: { id },
      data: {
        country: data.country,
        description: data.description,
        // Detailed stage updating (add/remove/update) requires complex nested write or a separate endpoint
      },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
  }

  async remove(id: string) {
    return this.db.visaWorkflow.delete({ where: { id } });
  }
}
