import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateBranchDto, actorId: string) {
    const company = await this.db.company.findFirst({
      where: { id: dto.companyId, deletedAt: null },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.db.$transaction(async (tx) => {
      const branch = await tx.branch.create({
        data: dto,
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          resource: 'Branch',
          resourceId: branch.id,
          afterValue: branch as any,
        },
      });

      return branch;
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    companyId?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    const [branches, total] = await Promise.all([
      this.db.branch.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.db.branch.count({ where }),
    ]);

    return {
      branches,
      meta: { total, page, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const branch = await this.db.branch.findUnique({
      where: { id },
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async update(id: string, dto: UpdateBranchDto, actorId: string) {
    const branch = await this.findOne(id);

    return this.db.$transaction(async (tx) => {
      const updated = await tx.branch.update({
        where: { id },
        data: dto,
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'UPDATE',
          resource: 'Branch',
          resourceId: id,
          beforeValue: branch as any,
          afterValue: updated as any,
        },
      });

      return updated;
    });
  }

  async remove(id: string, actorId: string) {
    const branch = await this.findOne(id);

    return this.db.$transaction(async (tx) => {
      await tx.branch.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'DELETE',
          resource: 'Branch',
          resourceId: id,
          beforeValue: branch as any,
        },
      });

      return { success: true };
    });
  }
}
