import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateCompanyDto, actorId: string) {
    const existing = await this.db.company.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('A company with this name already exists');
    }

    return this.db.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.name,
          industry: dto.industry,
          website: dto.website,
          accountManagerId: dto.accountManagerId,
          status: dto.status ?? 'ACTIVE',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          resource: 'Company',
          resourceId: company.id,
          afterValue: company as any,
        },
      });

      return company;
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    accountManagerId?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null, // Soft delete filter
    };

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.accountManagerId) {
      where.accountManagerId = query.accountManagerId;
    }

    const [companies, total] = await Promise.all([
      this.db.company.findMany({
        where,
        skip,
        take: limit,
        include: {
          accountManager: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: {
              contacts: true,
              contracts: true,
              branches: true,
              jobOpenings: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.db.company.count({ where }),
    ]);

    return {
      companies,
      meta: { total, page, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const company = await this.db.company.findFirst({
      where: { id, deletedAt: null },
      include: {
        accountManager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        contacts: true,
        contracts: true,
        branches: true,
        crmActivities: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, actorId: string) {
    const company = await this.findOne(id);

    if (dto.name && dto.name !== company.name) {
      const existing = await this.db.company.findFirst({
        where: { name: dto.name, deletedAt: null, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('A company with this name already exists');
      }
    }

    return this.db.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: { id },
        data: dto,
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'UPDATE',
          resource: 'Company',
          resourceId: id,
          beforeValue: company as any,
          afterValue: updated as any,
        },
      });

      return updated;
    });
  }

  async remove(id: string, actorId: string) {
    const company = await this.findOne(id);

    return this.db.$transaction(async (tx) => {
      const deleted = await tx.company.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'DELETE',
          resource: 'Company',
          resourceId: id,
          beforeValue: company as any,
          afterValue: deleted as any,
        },
      });

      return { success: true };
    });
  }
}
